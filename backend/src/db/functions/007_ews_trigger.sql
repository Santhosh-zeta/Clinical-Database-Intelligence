-- ============================================================
-- Function 007: EWS (NEWS2) Calculation + Trigger Chain
-- calculate_ews()       → computes NEWS2 score (0-20)
-- fn_ews_alert()        → fires dedup-aware alert
-- fn_ews_after_vitals() → AFTER INSERT trigger on vitals
-- ============================================================

-- NEWS2 scoring function
CREATE OR REPLACE FUNCTION calculate_ews(p_admission_id INT)
RETURNS SMALLINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec           vitals%ROWTYPE;
    v_org_id        INT;
    v_high_thresh   SMALLINT;
    v_urgent_thresh SMALLINT;
    v_rr_score      SMALLINT := 0;
    v_spo2_score    SMALLINT := 0;
    v_temp_score    SMALLINT := 0;
    v_bp_score      SMALLINT := 0;
    v_hr_score      SMALLINT := 0;
    v_total         SMALLINT := 0;
    v_category      VARCHAR(20);
BEGIN
    -- Get org-level thresholds
    SELECT a.organization_id INTO v_org_id FROM admissions a WHERE a.id = p_admission_id;
    SELECT os.ews_high_threshold, os.ews_urgent_threshold
    INTO v_high_thresh, v_urgent_thresh
    FROM organization_settings os WHERE os.org_id = v_org_id;
    v_high_thresh   := COALESCE(v_high_thresh, 5);
    v_urgent_thresh := COALESCE(v_urgent_thresh, 7);

    -- Fetch latest vitals
    SELECT * INTO v_rec FROM vitals
    WHERE admission_id = p_admission_id ORDER BY recorded_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN 0; END IF;

    -- Respiratory Rate (NEWS2 standard)
    IF v_rec.respiratory_rate IS NOT NULL THEN
        v_rr_score := CASE
            WHEN v_rec.respiratory_rate <= 8  THEN 3
            WHEN v_rec.respiratory_rate <= 11 THEN 1
            WHEN v_rec.respiratory_rate <= 20 THEN 0
            WHEN v_rec.respiratory_rate <= 24 THEN 2
            ELSE 3
        END;
    END IF;

    -- SpO2 (Scale 1 — standard; Scale 2 for COPD requires separate flag)
    IF v_rec.spo2 IS NOT NULL THEN
        v_spo2_score := CASE
            WHEN v_rec.spo2 <= 91 THEN 3
            WHEN v_rec.spo2 <= 93 THEN 2
            WHEN v_rec.spo2 <= 95 THEN 1
            ELSE 0
        END;
    END IF;

    -- Temperature
    IF v_rec.temperature IS NOT NULL THEN
        v_temp_score := CASE
            WHEN v_rec.temperature <= 35.0 THEN 3
            WHEN v_rec.temperature <= 36.0 THEN 1
            WHEN v_rec.temperature <= 38.0 THEN 0
            WHEN v_rec.temperature <= 39.0 THEN 1
            ELSE 2
        END;
    END IF;

    -- Systolic BP (NEWS2)
    IF v_rec.systolic_bp IS NOT NULL THEN
        v_bp_score := CASE
            WHEN v_rec.systolic_bp <= 90  THEN 3
            WHEN v_rec.systolic_bp <= 100 THEN 2
            WHEN v_rec.systolic_bp <= 110 THEN 1
            WHEN v_rec.systolic_bp <= 219 THEN 0
            ELSE 3
        END;
    END IF;

    -- Heart Rate (NEWS2)
    IF v_rec.heart_rate IS NOT NULL THEN
        v_hr_score := CASE
            WHEN v_rec.heart_rate <= 40  THEN 3
            WHEN v_rec.heart_rate <= 50  THEN 1
            WHEN v_rec.heart_rate <= 90  THEN 0
            WHEN v_rec.heart_rate <= 110 THEN 1
            WHEN v_rec.heart_rate <= 130 THEN 2
            ELSE 3
        END;
    END IF;

    v_total := LEAST(v_rr_score + v_spo2_score + v_temp_score + v_bp_score + v_hr_score, 20);

    v_category := CASE
        WHEN v_total >= v_urgent_thresh THEN 'urgent'
        WHEN v_total >= v_high_thresh   THEN 'high'
        WHEN v_total >= 3               THEN 'medium'
        ELSE 'low'
    END;

    -- Persist to ews_scores
    INSERT INTO ews_scores (
        admission_id, organization_id, total_score,
        rr_score, spo2_score, temp_score, bp_score, hr_score, category
    )
    SELECT p_admission_id, a.organization_id, v_total,
           v_rr_score, v_spo2_score, v_temp_score, v_bp_score, v_hr_score, v_category
    FROM admissions a WHERE a.id = p_admission_id;

    RETURN v_total;
END;
$$;

-- EWS-based alert with deduplication + org-configurable cooldown
CREATE OR REPLACE FUNCTION fn_ews_alert(p_admission_id INT, p_ews SMALLINT, p_category VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_doctor_id  INT;
    v_cooldown   INT;
    v_org_id     INT;
    v_alert_type VARCHAR(50);
    v_severity   VARCHAR(20);
    v_msg        TEXT;
    v_alert_id   INT;
    v_wait_min   INT;
BEGIN
    SELECT a.doctor_id, a.organization_id INTO v_doctor_id, v_org_id
    FROM admissions a WHERE a.id = p_admission_id;

    SELECT os.alert_cooldown_minutes, os.escalation_wait_minutes
    INTO v_cooldown, v_wait_min
    FROM organization_settings os WHERE os.org_id = v_org_id;
    v_cooldown := COALESCE(v_cooldown, 15);
    v_wait_min := COALESCE(v_wait_min, 10);

    v_alert_type := 'EWS_' || UPPER(p_category);
    v_severity   := CASE
        WHEN p_category = 'urgent' THEN 'critical'
        WHEN p_category = 'high'   THEN 'high'
        ELSE 'medium'
    END;
    v_msg := format('NEWS2 EWS Score: %s (%s risk) — immediate clinical review required.',
                    p_ews, UPPER(p_category));

    -- Deduplication: skip if same alert type exists within cooldown window
    IF EXISTS (
        SELECT 1 FROM alerts
        WHERE admission_id  = p_admission_id
          AND alert_type    = v_alert_type
          AND triggered_at  > NOW() - (v_cooldown || ' minutes')::INTERVAL
          AND is_acknowledged = FALSE
    ) THEN
        RETURN;
    END IF;

    INSERT INTO alerts
        (admission_id, alert_type, severity, message, organization_id, status, response_deadline)
    VALUES
        (p_admission_id, v_alert_type, v_severity, v_msg,
         v_org_id, 'active', NOW() + (v_wait_min || ' minutes')::INTERVAL)
    RETURNING id INTO v_alert_id;

    -- Notify attending doctor
    IF v_doctor_id IS NOT NULL AND v_alert_id IS NOT NULL THEN
        INSERT INTO notifications (doctor_id, admission_id, alert_id, message)
        VALUES (v_doctor_id, p_admission_id, v_alert_id, v_msg);
    END IF;
END;
$$;

-- AFTER INSERT trigger on vitals — EWS chain
CREATE OR REPLACE FUNCTION fn_ews_after_vitals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_ews        SMALLINT;
    v_cat        VARCHAR(20);
    v_patient_id INT;
    v_org_id     INT;
    v_auto_icu   BOOLEAN;
    v_urgent     SMALLINT;
BEGIN
    v_ews := calculate_ews(NEW.admission_id);

    SELECT category INTO v_cat FROM ews_scores
    WHERE admission_id = NEW.admission_id ORDER BY calculated_at DESC LIMIT 1;

    SELECT a.patient_id, a.organization_id INTO v_patient_id, v_org_id
    FROM admissions a WHERE a.id = NEW.admission_id;

    -- Fire EWS alert for medium and above
    IF v_ews >= 3 THEN
        PERFORM fn_ews_alert(NEW.admission_id, v_ews, v_cat);
    END IF;

    -- Read org-level ICU auto-assign setting + urgent threshold
    SELECT os.icu_auto_assign, os.ews_urgent_threshold
    INTO v_auto_icu, v_urgent
    FROM organization_settings os WHERE os.org_id = v_org_id;

    IF COALESCE(v_auto_icu, TRUE) AND v_ews >= COALESCE(v_urgent, 7) THEN
        PERFORM auto_escalate_to_icu(NEW.admission_id);
    END IF;

    -- Log to patient_events timeline
    INSERT INTO patient_events
        (patient_id, organization_id, event_type, reference_id, reference_table, description, metadata)
    VALUES (
        v_patient_id, v_org_id, 'ews_score', v_ews::INT, 'ews_scores',
        format('EWS Score: %s (%s)', v_ews, COALESCE(v_cat, 'low')),
        jsonb_build_object('ews', v_ews, 'category', v_cat)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ews_after_vitals ON vitals;
CREATE TRIGGER trg_ews_after_vitals
    AFTER INSERT ON vitals
    FOR EACH ROW EXECUTE FUNCTION fn_ews_after_vitals();

COMMENT ON FUNCTION calculate_ews IS 'NEWS2 Early Warning Score (0-20) — international clinical standard; reads org-configurable thresholds';
COMMENT ON FUNCTION fn_ews_alert   IS 'Fires dedup-aware EWS alert with org-configurable cooldown and response deadline';
