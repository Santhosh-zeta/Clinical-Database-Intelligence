-- ============================================================
-- Migration 025: Missing Timeline Triggers
-- Adds triggers for prescriptions, diagnoses, and symptoms
-- to ensure they appear in the patient_events timeline.
-- ============================================================

-- 1. Trigger for Prescriptions
CREATE OR REPLACE FUNCTION fn_patient_event_on_prescription()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
        SELECT a.patient_id, NEW.organization_id, 'prescription', NEW.id, 'prescriptions',
               format('New Prescription: %s (%s, %s)', m.name, NEW.dose, NEW.frequency),
               NEW.prescribed_by
        FROM admissions a
        JOIN medications m ON m.id = NEW.medication_id
        WHERE a.id = NEW.admission_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_event_prescription ON prescriptions;
CREATE TRIGGER trg_patient_event_prescription
    AFTER INSERT ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION fn_patient_event_on_prescription();

-- 2. Trigger for Diagnoses
CREATE OR REPLACE FUNCTION fn_patient_event_on_diagnosis()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
        SELECT a.patient_id, NEW.organization_id, 'diagnosis', NEW.id, 'diagnoses',
               format('Updated Diagnosis: %s (%s)', NEW.diagnosis_text, NEW.severity),
               NEW.doctor_id
        FROM admissions a
        WHERE a.id = NEW.admission_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_event_diagnosis ON diagnoses;
CREATE TRIGGER trg_patient_event_diagnosis
    AFTER INSERT ON diagnoses
    FOR EACH ROW EXECUTE FUNCTION fn_patient_event_on_diagnosis();

-- 3. Trigger for Symptoms
CREATE OR REPLACE FUNCTION fn_patient_event_on_symptom()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO patient_events
            (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
        SELECT NEW.patient_id, a.organization_id, 'symptom', NEW.id, 'patient_symptoms',
               format('Noted Symptom: %s (%s)', s.name, NEW.severity),
               NEW.noted_by
        FROM symptoms s
        JOIN admissions a ON a.id = NEW.admission_id
        WHERE s.id = NEW.symptom_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_event_symptom ON patient_symptoms;
CREATE TRIGGER trg_patient_event_symptom
    AFTER INSERT ON patient_symptoms
    FOR EACH ROW EXECUTE FUNCTION fn_patient_event_on_symptom();
