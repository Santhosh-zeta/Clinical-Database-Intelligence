-- ============================================================
-- Function 002: vitals insert trigger (Refactored for Dynamic Thresholds)
-- Fires AFTER INSERT on vitals:
--   1. Calls calculate_risk_score()
--   2. Creates alerts based on score
--   3. Inserts per-vital alerts using ORG-specific dynamic thresholds
--   4. Inserts notifications for the attending doctor
-- ============================================================

CREATE OR REPLACE FUNCTION fn_after_vitals_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score         SMALLINT;
    v_severity      VARCHAR(20);
    v_msg           TEXT;
    v_alert_id      INT;
    v_doctor_id     INT;
    v_org_id        INT;
    v_alert_type    VARCHAR(50);
    
    -- Dynamic thresholds
    v_hr_min        SMALLINT;
    v_hr_max        SMALLINT;
    v_spo2_min      NUMERIC(5,2);
    v_bp_sys_min    SMALLINT;
    v_bp_sys_max    SMALLINT;
    v_temp_min      NUMERIC(4,1);
    v_temp_max      NUMERIC(4,1);
BEGIN
    -- 0. Fetch Org and Thresholds
    SELECT a.organization_id, a.doctor_id INTO v_org_id, v_doctor_id
    FROM admissions a WHERE a.id = NEW.admission_id;

    SELECT hr_min, hr_max, spo2_min, bp_systolic_min, bp_systolic_max, temp_min, temp_max
    INTO v_hr_min, v_hr_max, v_spo2_min, v_bp_sys_min, v_bp_sys_max, v_temp_min, v_temp_max
    FROM organization_settings WHERE org_id = v_org_id;

    -- Defaults if settings missing
    v_hr_min     := COALESCE(v_hr_min, 50);
    v_hr_max     := COALESCE(v_hr_max, 130);
    v_spo2_min   := COALESCE(v_spo2_min, 95.0);
    v_bp_sys_min := COALESCE(v_bp_sys_min, 90);
    v_bp_sys_max := COALESCE(v_bp_sys_max, 150);
    v_temp_min   := COALESCE(v_temp_min, 36.0);
    v_temp_max   := COALESCE(v_temp_max, 38.5);

    -- 1. Calculate risk score (also writes to risk_scores table)
    v_score := calculate_risk_score(NEW.admission_id);

    -- 2. Determine if we need an alert based on total score
    IF v_score >= 8 THEN
        v_severity   := 'critical';
        v_alert_type := 'CRITICAL_RISK_SCORE';
        v_msg        := format('CRITICAL: Risk score %s for admission #%s. Immediate intervention required.', v_score, NEW.admission_id);
    ELSIF v_score >= 5 THEN
        v_severity   := 'high';
        v_alert_type := 'HIGH_RISK_SCORE';
        v_msg        := format('HIGH RISK: Score %s for admission #%s. Close monitoring required.', v_score, NEW.admission_id);
    ELSIF v_score >= 3 THEN
        v_severity   := 'medium';
        v_alert_type := 'MODERATE_RISK_SCORE';
        v_msg        := format('MODERATE RISK: Score %s for admission #%s.', v_score, NEW.admission_id);
    END IF;

    -- 3. Per-vital threshold alerts (Dynamic)
    IF NEW.heart_rate IS NOT NULL AND (NEW.heart_rate < v_hr_min OR NEW.heart_rate > v_hr_max) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.heart_rate > v_hr_max THEN 'HIGH_HEART_RATE' ELSE 'LOW_HEART_RATE' END,
                CASE WHEN NEW.heart_rate > v_hr_max + 20 OR NEW.heart_rate < v_hr_min - 10 THEN 'critical' ELSE 'high' END,
                format('Abnormal heart rate: %s bpm (Threshold: %s-%s)', NEW.heart_rate, v_hr_min, v_hr_max),
                v_org_id);
    END IF;

    IF NEW.spo2 IS NOT NULL AND NEW.spo2 < v_spo2_min THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (NEW.admission_id, 'LOW_SPO2',
                CASE WHEN NEW.spo2 < v_spo2_min - 5 THEN 'critical' WHEN NEW.spo2 < v_spo2_min - 2 THEN 'high' ELSE 'medium' END,
                format('Low oxygen saturation: %s%% (Min: %s%%)', NEW.spo2, v_spo2_min),
                v_org_id);
    END IF;

    IF NEW.systolic_bp IS NOT NULL AND (NEW.systolic_bp < v_bp_sys_min OR NEW.systolic_bp > v_bp_sys_max) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.systolic_bp > v_bp_sys_max THEN 'HIGH_BP' ELSE 'LOW_BP' END,
                CASE WHEN NEW.systolic_bp > v_bp_sys_max + 30 OR NEW.systolic_bp < v_bp_sys_min - 20 THEN 'critical' ELSE 'high' END,
                format('Abnormal blood pressure: %s mmHg (Threshold: %s-%s)', NEW.systolic_bp, v_bp_sys_min, v_bp_sys_max),
                v_org_id);
    END IF;

    IF NEW.temperature IS NOT NULL AND (NEW.temperature < v_temp_min OR NEW.temperature > v_temp_max) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.temperature > v_temp_max THEN 'FEVER' ELSE 'HYPOTHERMIA' END,
                CASE WHEN NEW.temperature > v_temp_max + 1.5 OR NEW.temperature < v_temp_min - 1.5 THEN 'critical' ELSE 'medium' END,
                format('Abnormal temperature: %s°C (Threshold: %s-%s)', NEW.temperature, v_temp_min, v_temp_max),
                v_org_id);
    END IF;

    -- 4. Insert main risk-score alert if applicable
    IF v_alert_type IS NOT NULL THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (NEW.admission_id, v_alert_type, v_severity, v_msg, v_org_id)
        RETURNING id INTO v_alert_id;

        -- 5. Notify the attending doctor
        IF v_doctor_id IS NOT NULL THEN
            INSERT INTO notifications (doctor_id, admission_id, alert_id, message)
            VALUES (v_doctor_id, NEW.admission_id, v_alert_id, v_msg);
        END IF;

        -- 6. Auto-escalate to ICU if critical
        IF v_score >= 8 THEN
            PERFORM auto_escalate_to_icu(NEW.admission_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_vitals_insert ON vitals;
CREATE TRIGGER trg_after_vitals_insert
    AFTER INSERT ON vitals
    FOR EACH ROW
    EXECUTE FUNCTION fn_after_vitals_insert();

COMMENT ON FUNCTION fn_after_vitals_insert IS
    'Dynamic trigger function: calculates risk score, fires per-vital alerts using org-specific thresholds, and notifies staff';
