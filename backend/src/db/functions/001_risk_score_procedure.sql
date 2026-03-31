-- ============================================================
-- Function 001: calculate_risk_score(admission_id)
-- Scores the latest vitals reading for an admission 0-10
-- and writes the result to the risk_scores table.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_risk_score(p_admission_id INT)
RETURNS SMALLINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec           vitals%ROWTYPE;
    v_hr_score      SMALLINT := 0;
    v_bp_score      SMALLINT := 0;
    v_spo2_score    SMALLINT := 0;
    v_temp_score    SMALLINT := 0;
    v_total         SMALLINT := 0;
    v_category      VARCHAR(20);
BEGIN
    -- Fetch the most recent vitals for this admission
    SELECT *
    INTO v_rec
    FROM vitals
    WHERE admission_id = p_admission_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- ── Heart Rate Scoring ─────────────────────────────────────────
    -- Normal: 60-100 bpm  →  0 pts
    -- Mild:   50-59 | 101-120  →  1 pt
    -- High:   <50 | 121-140  →  2 pts
    -- Critical: <40 | >140  →  3 pts
    IF v_rec.heart_rate IS NOT NULL THEN
        IF v_rec.heart_rate < 40 OR v_rec.heart_rate > 140 THEN
            v_hr_score := 3;
        ELSIF v_rec.heart_rate < 50 OR v_rec.heart_rate > 120 THEN
            v_hr_score := 2;
        ELSIF v_rec.heart_rate < 60 OR v_rec.heart_rate > 100 THEN
            v_hr_score := 1;
        ELSE
            v_hr_score := 0;
        END IF;
    END IF;

    -- ── Blood Pressure Scoring (Systolic) ──────────────────────────
    -- Normal: 90-140  →  0 pts
    -- Mild:   80-89 | 141-160  →  1 pt
    -- High:   70-79 | 161-180  →  2 pts
    -- Critical: <70 | >180  →  3 pts
    IF v_rec.systolic_bp IS NOT NULL THEN
        IF v_rec.systolic_bp < 70 OR v_rec.systolic_bp > 180 THEN
            v_bp_score := 3;
        ELSIF v_rec.systolic_bp < 80 OR v_rec.systolic_bp > 160 THEN
            v_bp_score := 2;
        ELSIF v_rec.systolic_bp < 90 OR v_rec.systolic_bp > 140 THEN
            v_bp_score := 1;
        ELSE
            v_bp_score := 0;
        END IF;
    END IF;

    -- ── SpO2 Scoring ───────────────────────────────────────────────
    -- Normal: >=95%  →  0 pts
    -- Mild:   90-94%  →  1 pt
    -- High:   85-89%  →  2 pts
    -- Critical: <85%  →  3 pts
    IF v_rec.spo2 IS NOT NULL THEN
        IF v_rec.spo2 < 85 THEN
            v_spo2_score := 3;
        ELSIF v_rec.spo2 < 90 THEN
            v_spo2_score := 2;
        ELSIF v_rec.spo2 < 95 THEN
            v_spo2_score := 1;
        ELSE
            v_spo2_score := 0;
        END IF;
    END IF;

    -- ── Temperature Scoring ────────────────────────────────────────
    -- Normal: 36.0-38.0°C  →  0 pts
    -- Mild:   35-35.9 | 38.1-39.0  →  1 pt
    -- High:   34-34.9 | 39.1-40.0  →  2 pts
    -- Critical: <34 | >40  →  3 pts
    IF v_rec.temperature IS NOT NULL THEN
        IF v_rec.temperature < 34 OR v_rec.temperature > 40 THEN
            v_temp_score := 3;
        ELSIF v_rec.temperature < 35 OR v_rec.temperature > 39 THEN
            v_temp_score := 2;
        ELSIF v_rec.temperature < 36 OR v_rec.temperature > 38 THEN
            v_temp_score := 1;
        ELSE
            v_temp_score := 0;
        END IF;
    END IF;

    -- ── Aggregate & Cap at 10 ──────────────────────────────────────
    v_total := LEAST(v_hr_score + v_bp_score + v_spo2_score + v_temp_score, 10);

    -- ── Derive Category ───────────────────────────────────────────
    v_category := CASE
        WHEN v_total >= 8  THEN 'critical'
        WHEN v_total >= 5  THEN 'high'
        WHEN v_total >= 3  THEN 'moderate'
        ELSE 'stable'
    END;

    -- ── Persist to risk_scores ────────────────────────────────────
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
