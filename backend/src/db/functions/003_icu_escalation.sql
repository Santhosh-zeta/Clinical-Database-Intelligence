-- ============================================================
-- Function 003: auto_escalate_to_icu(admission_id)
-- Finds an available ICU bed and reassigns the patient.
-- Called automatically by the vitals trigger when score >= 8.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_escalate_to_icu(p_admission_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_icu_bed_id    INT;
    v_icu_ward_id   INT;
    v_current_bed   BOOLEAN;
    v_admission     RECORD;
BEGIN
    -- Fetch current admission
    SELECT * INTO v_admission FROM admissions WHERE id = p_admission_id;

    -- Check if already in ICU (avoid re-escalation loop)
    SELECT b.is_icu INTO STRICT v_current_bed
    FROM beds b WHERE b.id = v_admission.bed_id;

    IF v_current_bed THEN
        RETURN;  -- Already in ICU
    END IF;

    -- Find an available ICU bed
    SELECT b.id, b.ward_id
    INTO v_icu_bed_id, v_icu_ward_id
    FROM beds b
    WHERE b.is_icu = TRUE AND b.is_occupied = FALSE
    ORDER BY b.id
    LIMIT 1;

    IF NOT FOUND THEN
        -- No ICU bed available — still raise a critical alert
        INSERT INTO alerts (admission_id, alert_type, severity, message)
        VALUES (p_admission_id, 'ICU_UNAVAILABLE', 'critical',
                'Critical patient requires ICU but no beds available.');
        RETURN;
    END IF;

    -- Free the old bed (if any)
    IF v_admission.bed_id IS NOT NULL THEN
        UPDATE beds SET is_occupied = FALSE WHERE id = v_admission.bed_id;
    END IF;

    -- Assign new ICU bed
    UPDATE beds SET is_occupied = TRUE WHERE id = v_icu_bed_id;

    -- Update admission
    UPDATE admissions
    SET bed_id  = v_icu_bed_id,
        ward_id = v_icu_ward_id,
        notes   = COALESCE(notes, '') || E'\n[AUTO] Escalated to ICU at ' || NOW()::TEXT
    WHERE id = p_admission_id;

    -- Audit log
    INSERT INTO audit_logs (table_name, record_id, action, new_data)
    VALUES ('admissions', p_admission_id, 'UPDATE',
            jsonb_build_object('action', 'icu_escalation', 'bed_id', v_icu_bed_id, 'ward_id', v_icu_ward_id));

    -- ICU escalation alert
    INSERT INTO alerts (admission_id, alert_type, severity, message)
    VALUES (p_admission_id, 'ICU_ESCALATION', 'critical',
            format('Patient automatically escalated to ICU bed #%s', v_icu_bed_id));
END;
$$;

COMMENT ON FUNCTION auto_escalate_to_icu IS
    'Automatically moves a critical patient to the first available ICU bed and logs the action';
