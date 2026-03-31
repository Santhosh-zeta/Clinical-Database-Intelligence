-- ============================================================
-- Function 002: vitals insert trigger
-- Fires AFTER INSERT on vitals:
--   1. Calls calculate_risk_score()
--   2. Creates alerts based on score
--   3. Inserts notifications for the attending doctor
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
    v_rec           RECORD;
    v_alert_type    VARCHAR(50);
BEGIN
    -- 1. Calculate risk score (also writes to risk_scores table)
    v_score := calculate_risk_score(NEW.admission_id);

    -- 2. Determine if we need an alert
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
    ELSE
        -- Stable: no alert needed
        RETURN NEW;
    END IF;

    -- Per-vital threshold alerts (stack with overall score alert)
    IF NEW.heart_rate IS NOT NULL AND (NEW.heart_rate < 50 OR NEW.heart_rate > 130) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.heart_rate > 130 THEN 'HIGH_HEART_RATE' ELSE 'LOW_HEART_RATE' END,
                CASE WHEN NEW.heart_rate > 140 OR NEW.heart_rate < 40 THEN 'critical' ELSE 'high' END,
                format('Abnormal heart rate: %s bpm', NEW.heart_rate));
    END IF;

    IF NEW.spo2 IS NOT NULL AND NEW.spo2 < 95 THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message)
        VALUES (NEW.admission_id, 'LOW_SPO2',
                CASE WHEN NEW.spo2 < 88 THEN 'critical' WHEN NEW.spo2 < 92 THEN 'high' ELSE 'medium' END,
                format('Low oxygen saturation: %s%%', NEW.spo2));
    END IF;

    IF NEW.systolic_bp IS NOT NULL AND (NEW.systolic_bp < 90 OR NEW.systolic_bp > 150) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.systolic_bp > 150 THEN 'HIGH_BP' ELSE 'LOW_BP' END,
                CASE WHEN NEW.systolic_bp > 180 OR NEW.systolic_bp < 70 THEN 'critical' ELSE 'high' END,
                format('Abnormal blood pressure: %s mmHg (systolic)', NEW.systolic_bp));
    END IF;

    IF NEW.temperature IS NOT NULL AND (NEW.temperature < 36.0 OR NEW.temperature > 38.5) THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message)
        VALUES (NEW.admission_id,
                CASE WHEN NEW.temperature > 38.5 THEN 'FEVER' ELSE 'HYPOTHERMIA' END,
                CASE WHEN NEW.temperature > 40 OR NEW.temperature < 34 THEN 'critical' ELSE 'medium' END,
                format('Abnormal temperature: %s°C', NEW.temperature));
    END IF;

    -- 3. Insert main risk-score alert and capture its id
    INSERT INTO alerts (admission_id, alert_type, severity, message)
    VALUES (NEW.admission_id, v_alert_type, v_severity, v_msg)
    RETURNING id INTO v_alert_id;

    -- 4. Notify the attending doctor
    SELECT a.doctor_id INTO v_doctor_id
    FROM admissions a
    WHERE a.id = NEW.admission_id;

    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO notifications (doctor_id, admission_id, alert_id, message)
        VALUES (v_doctor_id, NEW.admission_id, v_alert_id, v_msg);
    END IF;

    -- 5. Auto-escalate to ICU if critical
    IF v_score >= 8 THEN
        PERFORM auto_escalate_to_icu(NEW.admission_id);
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to vitals table
DROP TRIGGER IF EXISTS trg_after_vitals_insert ON vitals;
CREATE TRIGGER trg_after_vitals_insert
    AFTER INSERT ON vitals
    FOR EACH ROW
    EXECUTE FUNCTION fn_after_vitals_insert();

COMMENT ON FUNCTION fn_after_vitals_insert IS
    'Trigger function: calculates risk score, fires per-vital threshold alerts, notifies attending doctor, and escalates to ICU when score >= 8';
