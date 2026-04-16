CREATE OR REPLACE FUNCTION fn_alert_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_org_id     INT;
    v_patient_id INT;
    v_adm_name   VARCHAR;
    v_payload    JSONB;
BEGIN

    SELECT a.organization_id, a.patient_id, p.name
    INTO v_org_id, v_patient_id, v_adm_name
    FROM admissions a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = NEW.admission_id;

    v_payload := jsonb_build_object(
        'event', 'new_alert',
        'alert_id', NEW.id,
        'admission_id', NEW.admission_id,
        'patient_id', v_patient_id,
        'patient_name', v_adm_name,
        'organization_id', COALESCE(NEW.organization_id, v_org_id),
        'alert_type', NEW.alert_type,
        'severity', NEW.severity,
        'message', NEW.message,
        'triggered_at', NEW.triggered_at
    );

    PERFORM pg_notify('clinical_alerts', v_payload::text);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_notify ON alerts;
CREATE TRIGGER trg_alert_notify
    AFTER INSERT ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION fn_alert_notify();

COMMENT ON FUNCTION fn_alert_notify IS 'Trigger function: Emits a clinical_alerts notification for live UI updates via WebSockets';
