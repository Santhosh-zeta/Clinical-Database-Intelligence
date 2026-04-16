CREATE OR REPLACE FUNCTION trigger_notify_on_alert()
RETURNS TRIGGER AS $$
DECLARE
    target_doctor_id INT;
    target_org_id INT;
BEGIN

    IF NEW.admission_id IS NOT NULL THEN

        SELECT doctor_id, organization_id INTO target_doctor_id, target_org_id
        FROM admissions WHERE id = NEW.admission_id;

        IF target_doctor_id IS NOT NULL THEN
            INSERT INTO notifications (doctor_id, admission_id, alert_id, message, created_at, type)
            VALUES (target_doctor_id, NEW.admission_id, NEW.id, NEW.message, NEW.triggered_at, 'alert');

            PERFORM pg_notify('clinical_notifications', json_build_object(
                'id', NEW.id,
                'doctor_id', target_doctor_id,
                'message', NEW.message,
                'organization_id', target_org_id,
                'type', 'alert'
            )::text);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_notification_trigger ON alerts;
CREATE TRIGGER alert_notification_trigger
AFTER INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION trigger_notify_on_alert();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'alert';
