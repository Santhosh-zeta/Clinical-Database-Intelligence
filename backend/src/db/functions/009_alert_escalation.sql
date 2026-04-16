CREATE OR REPLACE FUNCTION escalate_unacknowledged_alerts()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count     INT := 0;
    v_alert     RECORD;
    v_wait      INT;
    v_doctor_id INT;
BEGIN
    FOR v_alert IN
        SELECT al.id, al.admission_id, al.organization_id,
               al.escalation_level, al.message, al.severity
        FROM alerts al
        WHERE al.status         = 'active'
          AND al.is_acknowledged = FALSE
          AND al.severity       IN ('critical', 'high')
          AND al.response_deadline < NOW()
          AND al.escalation_level < 3
    LOOP
        SELECT os.escalation_wait_minutes INTO v_wait
        FROM organization_settings os WHERE os.org_id = v_alert.organization_id;
        v_wait := COALESCE(v_wait, 10);

        UPDATE alerts
        SET escalation_level  = escalation_level + 1,
            escalated_at      = NOW(),
            status            = 'escalated',
            response_deadline = NOW() + (v_wait || ' minutes')::INTERVAL
        WHERE id = v_alert.id;

        SELECT d.id INTO v_doctor_id
        FROM doctors d
        JOIN user_roles ur ON ur.doctor_id = d.id
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.org_id = v_alert.organization_id
          AND r.name = 'admin'
          AND d.is_active = TRUE
        ORDER BY d.id LIMIT 1;

        IF v_doctor_id IS NOT NULL THEN
            INSERT INTO notifications (doctor_id, admission_id, alert_id, message)
            VALUES (v_doctor_id, v_alert.admission_id, v_alert.id,
                    format('[ESCALATED L%s] %s', v_alert.escalation_level + 1, v_alert.message));
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_duplicate_alerts()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE v_deleted INT;
BEGIN
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY admission_id, alert_type
                   ORDER BY triggered_at DESC
               ) AS rn
        FROM alerts
        WHERE is_acknowledged = FALSE AND status = 'active'
    )
    DELETE FROM alerts WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION escalate_unacknowledged_alerts IS
    'Escalates overdue high/critical alerts to next escalation level; notifies org admin. Call via pg_cron every 5 minutes.';

COMMENT ON FUNCTION cleanup_duplicate_alerts IS
    'Removes duplicate active alerts per (admission, alert_type); keeps newest. Prevents alert storm.';
