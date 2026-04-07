-- ============================================================
-- Migration 027: Trend Detection Trigger
-- Automatically runs fn_detect_trend after vitals insertion
-- and fires alerts/timeline events if deteriorating.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trend_after_vitals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_res RECORD;
    v_patient_id INT;
    v_org_id     INT;
    v_alert_id   INT;
BEGIN
    -- Call the clinical intelligence function
    SELECT * INTO v_res FROM fn_detect_trend(NEW.admission_id);

    IF v_res.deteriorating THEN
        -- Get patient/org context
        SELECT patient_id, organization_id INTO v_patient_id, v_org_id
        FROM admissions WHERE id = NEW.admission_id;

        -- Deduplicate Trend Alerts (30 min cooldown)
        IF NOT EXISTS (
            SELECT 1 FROM alerts
            WHERE admission_id = NEW.admission_id
              AND alert_type = 'TREND_ALERT'
              AND triggered_at > NOW() - INTERVAL '30 minutes'
              AND is_acknowledged = FALSE
        ) THEN
            -- Create High Severity Alert
            INSERT INTO alerts (
                admission_id, alert_type, severity, message,
                organization_id, status, response_deadline
            )
            VALUES (
                NEW.admission_id, 'TREND_ALERT', 'high',
                array_to_string(v_res.alerts, ' | '),
                v_org_id, 'active', NOW() + INTERVAL '15 minutes'
            )
            RETURNING id INTO v_alert_id;

            -- Log to clinical timeline
            INSERT INTO patient_events (
                patient_id, organization_id, event_type, reference_id, reference_table,
                description, metadata
            )
            VALUES (
                v_patient_id, v_org_id, 'alert', v_alert_id, 'alerts',
                'Deterioration Trend Detected: ' || array_to_string(v_res.alerts, ' | '),
                jsonb_build_object(
                    'type', 'TREND_ALERT',
                    'delta_hr', v_res.delta_hr,
                    'delta_bp', v_res.delta_bp,
                    'delta_spo2', v_res.delta_spo2,
                    'delta_rr', v_res.delta_rr
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trend_after_vitals ON vitals;
CREATE TRIGGER trg_trend_after_vitals
    AFTER INSERT ON vitals
    FOR EACH ROW EXECUTE FUNCTION fn_trend_after_vitals();

COMMENT ON FUNCTION fn_trend_after_vitals IS 'Intelligence trigger: automatically detects deteriorating trends in vitals and fires proactive alerts.';
