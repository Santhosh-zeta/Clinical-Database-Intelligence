-- ============================================================
-- Migration 026: Clinical Intelligence Procedures & Functions
-- Moves core logic from JS layer to Database (Intelligence Layer)
-- ============================================================

-- 1. Atomic Patient Admission Procedure
-- Handles: Patient org check, Duplicate active admission check,
--          Bed availability check, and Admission creation.
CREATE OR REPLACE PROCEDURE pro_admit_patient(
    p_patient_id    INT,
    p_doctor_id     INT,
    p_ward_id       INT,
    p_bed_id        INT,
    p_diagnosis     TEXT,
    p_notes         TEXT,
    p_org_id        INT,
    INOUT p_admission_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verify patient belongs to org
    IF NOT EXISTS (SELECT 1 FROM patients WHERE id = p_patient_id AND organization_id = p_org_id) THEN
        RAISE EXCEPTION 'Patient % not found in organization %', p_patient_id, p_org_id;
    END IF;

    -- Prevent duplicate active admission
    IF EXISTS (SELECT 1 FROM admissions WHERE patient_id = p_patient_id AND status = 'active') THEN
        RAISE EXCEPTION 'Patient % already has an active admission', p_patient_id;
    END IF;

    -- Bed availability check (if bed_id is provided)
    IF p_bed_id IS NOT NULL THEN
        IF (SELECT is_occupied FROM beds WHERE id = p_bed_id) THEN
            RAISE EXCEPTION 'Bed % is already occupied', p_bed_id;
        END IF;

        -- Mark bed as occupied
        UPDATE beds SET is_occupied = TRUE WHERE id = p_bed_id;
    END IF;

    -- Create admission
    INSERT INTO admissions (
        patient_id, doctor_id, ward_id, bed_id,
        diagnosis, notes, organization_id, status, admitted_at
    )
    VALUES (
        p_patient_id, p_doctor_id, p_ward_id, p_bed_id,
        p_diagnosis, p_notes, p_org_id, 'active', NOW()
    )
    RETURNING id INTO p_admission_id;

    -- Log to audit
    INSERT INTO audit_logs (table_name, record_id, action, new_data, organization_id)
    VALUES ('admissions', p_admission_id, 'INSERT',
            jsonb_build_object('patient_id', p_patient_id, 'doctor_id', p_doctor_id, 'bed_id', p_bed_id),
            p_org_id);
END;
$$;

-- 2. Atomic Patient Discharge Procedure
CREATE OR REPLACE PROCEDURE pro_discharge_patient(
    p_admission_id  INT,
    p_org_id        INT,
    p_notes         TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_bed_id INT;
BEGIN
    -- Get bed_id to release
    SELECT bed_id INTO v_bed_id FROM admissions
    WHERE id = p_admission_id AND organization_id = p_org_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active admission % not found in org %', p_admission_id, p_org_id;
    END IF;

    -- Release bed
    IF v_bed_id IS NOT NULL THEN
        UPDATE beds SET is_occupied = FALSE WHERE id = v_bed_id;
    END IF;

    -- Update admission status
    UPDATE admissions
    SET status = 'discharged',
        discharged_at = NOW(),
        notes = COALESCE(notes, '') || E'\n[DISCHARGE] ' || COALESCE(p_notes, ''),
        updated_at = NOW()
    WHERE id = p_admission_id;

    -- Log to audit
    INSERT INTO audit_logs (table_name, record_id, action, new_data, organization_id)
    VALUES ('admissions', p_admission_id, 'UPDATE',
            jsonb_build_object('status', 'discharged', 'bed_id_released', v_bed_id),
            p_org_id);
END;
$$;

-- 3. SQL Trend Detection Function (Intelligence Layer)
-- Returns details if deteriorating, using analytical window functions
CREATE OR REPLACE FUNCTION fn_detect_trend(p_admission_id INT, p_window INT DEFAULT 5)
RETURNS TABLE (
    deteriorating BOOLEAN,
    alerts TEXT[],
    delta_hr NUMERIC,
    delta_bp NUMERIC,
    delta_spo2 NUMERIC,
    delta_rr NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_first RECORD;
    v_last  RECORD;
    v_alerts TEXT[] := '{}';
BEGIN
    -- Fetch first and last readings in the window
    WITH recent_vitals AS (
        SELECT heart_rate, systolic_bp, spo2, respiratory_rate
        FROM vitals
        WHERE admission_id = p_admission_id
        ORDER BY recorded_at DESC
        LIMIT p_window
    ),
    ordered AS (
        SELECT *, row_number() OVER () as rn FROM recent_vitals
    )
    SELECT * INTO v_last FROM ordered WHERE rn = 1;

    WITH recent_vitals AS (
        SELECT heart_rate, systolic_bp, spo2, respiratory_rate
        FROM vitals
        WHERE admission_id = p_admission_id
        ORDER BY recorded_at DESC
        LIMIT p_window
    ),
    ordered AS (
        SELECT *, row_number() OVER () as rn FROM recent_vitals
    ),
    cnt AS (SELECT max(rn) as total FROM ordered)
    SELECT o.* INTO v_first FROM ordered o, cnt WHERE o.rn = cnt.total;

    IF v_first IS NULL OR v_last IS NULL OR v_first.rn = 1 THEN
        RETURN QUERY SELECT FALSE, '{}'::TEXT[], 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    delta_hr := v_last.heart_rate - v_first.heart_rate;
    delta_bp := v_last.systolic_bp - v_first.systolic_bp;
    delta_spo2 := v_last.spo2 - v_first.spo2;
    delta_rr := v_last.respiratory_rate - v_first.respiratory_rate;

    IF delta_hr > 30 THEN v_alerts := array_append(v_alerts, format('Rapid HR rise: +%s bpm', delta_hr)); END IF;
    IF delta_hr < -20 THEN v_alerts := array_append(v_alerts, format('Rapid HR drop: %s bpm', delta_hr)); END IF;
    IF delta_spo2 < -5 THEN v_alerts := array_append(v_alerts, format('Rapid SpO2 decline: %s%%', delta_spo2)); END IF;
    IF delta_bp < -30 THEN v_alerts := array_append(v_alerts, format('Rapid BP crash: %s mmHg', delta_bp)); END IF;
    IF delta_rr > 8 THEN v_alerts := array_append(v_alerts, format('Respiratory distress trend: +%s breaths/min', delta_rr)); END IF;

    deteriorating := (array_length(v_alerts, 1) > 0);
    alerts := v_alerts;

    RETURN NEXT;
END;
$$;
