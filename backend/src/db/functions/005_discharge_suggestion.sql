-- ============================================================
-- Function 005: suggest_discharge(admission_id)
-- Returns TRUE if the last 3 risk scores are all <= 2 (stable)
-- API exposes this as the discharge_ready flag.
-- ============================================================

CREATE OR REPLACE FUNCTION suggest_discharge(p_admission_id INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count     INT;
    v_low_count INT;
BEGIN
    -- Count last 3 risk scores
    SELECT COUNT(*), SUM(CASE WHEN score <= 2 THEN 1 ELSE 0 END)
    INTO v_count, v_low_count
    FROM (
        SELECT score
        FROM risk_scores
        WHERE admission_id = p_admission_id
        ORDER BY calculated_at DESC
        LIMIT 3
    ) AS last_scores;

    -- Need at least 3 readings all in stable range
    RETURN (v_count = 3 AND v_low_count = 3);
END;
$$;

COMMENT ON FUNCTION suggest_discharge IS
    'Returns TRUE when the last 3 risk scores for an admission are all <= 2 (stable), suggesting the patient is ready for discharge';
