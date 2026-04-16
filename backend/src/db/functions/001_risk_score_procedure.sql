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
    v_total         SMALLINT := 0;
    v_category      VARCHAR(20);
BEGIN

    SELECT value INTO v_conf FROM system_configurations WHERE key = 'clinical_thresholds';

    v_hr_max   := COALESCE((v_conf->>'hrMax')::INT, 140);
    v_hr_min   := COALESCE((v_conf->>'hrMin')::INT, 40);
    v_sys_max  := COALESCE((v_conf->>'sysMax')::INT, 180);
    v_spo2_min := COALESCE((v_conf->>'spo2Min')::INT, 85);
    v_temp_max := COALESCE((v_conf->>'tempMax')::NUMERIC, 40.0);

    SELECT *
    INTO v_rec
    FROM vitals
    WHERE admission_id = p_admission_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    IF v_rec.heart_rate IS NOT NULL THEN
        IF v_rec.heart_rate < v_hr_min OR v_rec.heart_rate > v_hr_max THEN
            v_hr_score := 3;
        ELSIF v_rec.heart_rate < 50 OR v_rec.heart_rate > 120 THEN
            v_hr_score := 2;
        ELSIF v_rec.heart_rate < 60 OR v_rec.heart_rate > 100 THEN
            v_hr_score := 1;
        ELSE
            v_hr_score := 0;
        END IF;
    END IF;

    IF v_rec.systolic_bp IS NOT NULL THEN
        IF v_rec.systolic_bp < 70 OR v_rec.systolic_bp > v_sys_max THEN
            v_bp_score := 3;
        ELSIF v_rec.systolic_bp < 80 OR v_rec.systolic_bp > 160 THEN
            v_bp_score := 2;
        ELSIF v_rec.systolic_bp < 90 OR v_rec.systolic_bp > 140 THEN
            v_bp_score := 1;
        ELSE
            v_bp_score := 0;
        END IF;
    END IF;

    IF v_rec.spo2 IS NOT NULL THEN
        IF v_rec.spo2 < v_spo2_min THEN
            v_spo2_score := 3;
        ELSIF v_rec.spo2 < 90 THEN
            v_spo2_score := 2;
        ELSIF v_rec.spo2 < 95 THEN
            v_spo2_score := 1;
        ELSE
            v_spo2_score := 0;
        END IF;
    END IF;

    IF v_rec.temperature IS NOT NULL THEN
        IF v_rec.temperature < 34 OR v_rec.temperature > v_temp_max THEN
            v_temp_score := 3;
        ELSIF v_rec.temperature < 35 OR v_rec.temperature > 39 THEN
            v_temp_score := 2;
        ELSIF v_rec.temperature < 36 OR v_rec.temperature > 38 THEN
            v_temp_score := 1;
        ELSE
            v_temp_score := 0;
        END IF;
    END IF;

    v_total := LEAST(v_hr_score + v_bp_score + v_spo2_score + v_temp_score, 10);

    v_category := CASE
        WHEN v_total >= 8  THEN 'critical'
        WHEN v_total >= 5  THEN 'high'
        WHEN v_total >= 3  THEN 'moderate'
        ELSE 'stable'
    END;

    INSERT INTO risk_scores (
        admission_id, score,
        hr_score, bp_score, spo2_score, temp_score,
        category
    ) VALUES (
        p_admission_id, v_total,
        v_hr_score, v_bp_score, v_spo2_score, v_temp_score,
        v_category
    );

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION calculate_risk_score IS
    'Scores the latest vitals for an admission on a 0-10 scale and persists to risk_scores';
