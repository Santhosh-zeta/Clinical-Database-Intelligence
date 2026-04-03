-- ============================================================
-- Function 008: Updated calculate_risk_score
-- Adds: Respiratory Rate scoring + Blood Glucose scoring
-- Uses CREATE OR REPLACE to safely override Function 001
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_risk_score(p_admission_id INT)
RETURNS SMALLINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec           vitals%ROWTYPE;
    v_conf          JSONB;
    v_hr_max        INT;
    v_hr_min        INT;
    v_sys_max       INT;
    v_spo2_min      INT;
    v_temp_max      NUMERIC;
    v_hr_score      SMALLINT := 0;
    v_bp_score      SMALLINT := 0;
    v_spo2_score    SMALLINT := 0;
    v_temp_score    SMALLINT := 0;
    v_rr_score      SMALLINT := 0;  -- NEW
    v_glucose_score SMALLINT := 0;  -- NEW
    v_total         SMALLINT := 0;
    v_category      VARCHAR(20);
BEGIN
    SELECT value INTO v_conf FROM system_configurations WHERE key = 'clinical_thresholds';
    v_hr_max   := COALESCE((v_conf->>'hrMax')::INT,    140);
    v_hr_min   := COALESCE((v_conf->>'hrMin')::INT,    40);
    v_sys_max  := COALESCE((v_conf->>'sysMax')::INT,   180);
    v_spo2_min := COALESCE((v_conf->>'spo2Min')::INT,  85);
    v_temp_max := COALESCE((v_conf->>'tempMax')::NUMERIC, 40.0);

    SELECT * INTO v_rec FROM vitals
    WHERE admission_id = p_admission_id ORDER BY recorded_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN 0; END IF;

    -- Heart Rate
    IF v_rec.heart_rate IS NOT NULL THEN
        v_hr_score := CASE
            WHEN v_rec.heart_rate < v_hr_min OR v_rec.heart_rate > v_hr_max THEN 3
            WHEN v_rec.heart_rate < 50 OR v_rec.heart_rate > 120 THEN 2
            WHEN v_rec.heart_rate < 60 OR v_rec.heart_rate > 100 THEN 1
            ELSE 0
        END;
    END IF;

    -- Blood Pressure
    IF v_rec.systolic_bp IS NOT NULL THEN
        v_bp_score := CASE
            WHEN v_rec.systolic_bp < 70 OR v_rec.systolic_bp > v_sys_max THEN 3
            WHEN v_rec.systolic_bp < 80 OR v_rec.systolic_bp > 160 THEN 2
            WHEN v_rec.systolic_bp < 90 OR v_rec.systolic_bp > 140 THEN 1
            ELSE 0
        END;
    END IF;

    -- SpO2
    IF v_rec.spo2 IS NOT NULL THEN
        v_spo2_score := CASE
            WHEN v_rec.spo2 < v_spo2_min THEN 3
            WHEN v_rec.spo2 < 90 THEN 2
            WHEN v_rec.spo2 < 95 THEN 1
            ELSE 0
        END;
    END IF;

    -- Temperature
    IF v_rec.temperature IS NOT NULL THEN
        v_temp_score := CASE
            WHEN v_rec.temperature < 34 OR v_rec.temperature > v_temp_max THEN 3
            WHEN v_rec.temperature < 35 OR v_rec.temperature > 39 THEN 2
            WHEN v_rec.temperature < 36 OR v_rec.temperature > 38 THEN 1
            ELSE 0
        END;
    END IF;

    -- Respiratory Rate (NEWLY ADDED — was captured but never scored)
    IF v_rec.respiratory_rate IS NOT NULL THEN
        v_rr_score := CASE
            WHEN v_rec.respiratory_rate <= 8  THEN 3
            WHEN v_rec.respiratory_rate <= 11 THEN 1
            WHEN v_rec.respiratory_rate <= 20 THEN 0
            WHEN v_rec.respiratory_rate <= 24 THEN 2
            ELSE 3
        END;
    END IF;

    -- Blood Glucose (NEWLY ADDED — was captured but never scored)
    IF v_rec.blood_glucose IS NOT NULL THEN
        v_glucose_score := CASE
            WHEN v_rec.blood_glucose < 60  OR v_rec.blood_glucose > 400 THEN 3
            WHEN v_rec.blood_glucose < 70  OR v_rec.blood_glucose > 250 THEN 2
            WHEN v_rec.blood_glucose > 180 THEN 1
            ELSE 0
        END;
    END IF;

    v_total := LEAST(
        v_hr_score + v_bp_score + v_spo2_score + v_temp_score + v_rr_score + v_glucose_score,
        10
    );

    v_category := CASE
        WHEN v_total >= 8 THEN 'critical'
        WHEN v_total >= 5 THEN 'high'
        WHEN v_total >= 3 THEN 'moderate'
        ELSE 'stable'
    END;

    INSERT INTO risk_scores (
        admission_id, score, hr_score, bp_score, spo2_score, temp_score, category
    ) VALUES (
        p_admission_id, v_total, v_hr_score, v_bp_score, v_spo2_score, v_temp_score, v_category
    );

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION calculate_risk_score IS
    'Updated: now includes respiratory_rate and blood_glucose in scoring (was a gap). Uses dynamic thresholds from system_configurations.';
