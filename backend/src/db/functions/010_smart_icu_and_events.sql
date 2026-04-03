-- ============================================================
-- Function 010: Smart ICU Allocation + Patient Events Triggers
-- auto_escalate_to_icu() — upgraded with dept preference + org scope
-- fn_patient_event_on_admission() — timeline trigger on admissions
-- ============================================================

-- Smart ICU allocation (overrides Function 003)
CREATE OR REPLACE FUNCTION auto_escalate_to_icu(p_admission_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_icu_bed_id  INT;
    v_icu_ward_id INT;
    v_is_icu      BOOLEAN;
    v_admission   RECORD;
    v_patient_id  INT;
    v_org_id      INT;
    v_auto_assign BOOLEAN;
BEGIN
    SELECT * INTO v_admission FROM admissions WHERE id = p_admission_id;
    v_patient_id := v_admission.patient_id;
    v_org_id     := v_admission.organization_id;

    -- Check org-level auto-assign setting
    SELECT icu_auto_assign INTO v_auto_assign
    FROM organization_settings WHERE org_id = v_org_id;
    IF NOT COALESCE(v_auto_assign, TRUE) THEN RETURN; END IF;

    -- Already in ICU? Skip.
    IF v_admission.bed_id IS NOT NULL THEN
        SELECT b.is_icu INTO v_is_icu FROM beds b WHERE b.id = v_admission.bed_id;
        IF COALESCE(v_is_icu, FALSE) THEN RETURN; END IF;
    END IF;

    -- SMART: prefer ICU bed in same department first
    SELECT b.id, b.ward_id INTO v_icu_bed_id, v_icu_ward_id
    FROM beds b
    JOIN wards w ON w.id = b.ward_id
    WHERE b.is_icu = TRUE
      AND b.is_occupied = FALSE
      AND b.organization_id = v_org_id
      AND w.department_id = (
          SELECT w2.department_id FROM wards w2 WHERE w2.id = v_admission.ward_id
      )
    ORDER BY b.id LIMIT 1;

    -- FALLBACK: any available ICU bed in org
    IF NOT FOUND THEN
        SELECT b.id, b.ward_id INTO v_icu_bed_id, v_icu_ward_id
        FROM beds b
        WHERE b.is_icu = TRUE
          AND b.is_occupied = FALSE
          AND b.organization_id = v_org_id
        ORDER BY b.id LIMIT 1;
    END IF;

    -- No ICU bed available
    IF NOT FOUND THEN
        INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
        VALUES (p_admission_id, 'ICU_UNAVAILABLE', 'critical',
                'Critical patient requires ICU — no beds available in this organization.', v_org_id);
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description)
        VALUES (v_patient_id, v_org_id, 'alert', p_admission_id, 'admissions',
                'ICU escalation failed — no beds available');
        RETURN;
    END IF;

    -- Free old bed
    IF v_admission.bed_id IS NOT NULL THEN
        UPDATE beds SET is_occupied = FALSE WHERE id = v_admission.bed_id;
    END IF;

    -- Assign ICU bed
    UPDATE beds SET is_occupied = TRUE WHERE id = v_icu_bed_id;

    -- Update admission
    UPDATE admissions
    SET bed_id  = v_icu_bed_id,
        ward_id = v_icu_ward_id,
        notes   = COALESCE(notes, '') || E'\n[AUTO] Smart ICU escalation at ' || NOW()::TEXT
    WHERE id = p_admission_id;

    -- Audit
    INSERT INTO audit_logs (table_name, record_id, action, new_data, organization_id)
    VALUES ('admissions', p_admission_id, 'UPDATE',
            jsonb_build_object('action','smart_icu_escalation','bed_id',v_icu_bed_id,'ward_id',v_icu_ward_id),
            v_org_id);

    -- Alert
    INSERT INTO alerts (admission_id, alert_type, severity, message, organization_id)
    VALUES (p_admission_id, 'ICU_ESCALATION', 'critical',
            format('Smart ICU allocation: patient moved to bed #%s (dept-preferred)', v_icu_bed_id),
            v_org_id);

    -- Patient timeline
    INSERT INTO patient_events
        (patient_id, organization_id, event_type, reference_id, reference_table, description, metadata)
    VALUES (v_patient_id, v_org_id, 'icu_escalation', v_icu_bed_id, 'beds',
            format('Auto-escalated to ICU bed #%s', v_icu_bed_id),
            jsonb_build_object('bed_id', v_icu_bed_id, 'ward_id', v_icu_ward_id));
END;
$$;

-- Patient timeline trigger on admissions INSERT/UPDATE
CREATE OR REPLACE FUNCTION fn_patient_event_on_admission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description, metadata)
        VALUES (NEW.patient_id, NEW.organization_id, 'admission', NEW.id, 'admissions',
                format('Admitted — Diagnosis: %s', COALESCE(NEW.diagnosis, 'Under evaluation')),
                jsonb_build_object('doctor_id', NEW.doctor_id, 'ward_id', NEW.ward_id, 'bed_id', NEW.bed_id));

    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'discharged' AND OLD.status = 'active' THEN
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description)
        VALUES (NEW.patient_id, NEW.organization_id, 'discharge', NEW.id, 'admissions',
                'Patient discharged');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_event_admission ON admissions;
CREATE TRIGGER trg_patient_event_admission
    AFTER INSERT OR UPDATE ON admissions
    FOR EACH ROW EXECUTE FUNCTION fn_patient_event_on_admission();

COMMENT ON FUNCTION auto_escalate_to_icu IS
    'Smart ICU allocation: org-aware, prefers same-department beds, falls back to any org ICU bed';
COMMENT ON FUNCTION fn_patient_event_on_admission IS
    'Populates patient_events timeline on admission/discharge';
