CREATE OR REPLACE FUNCTION suggest_discharge(p_admission_id INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count     INT;
    v_low_count INT;
BEGIN

    SELECT COUNT(*), SUM(CASE WHEN score <= 2 THEN 1 ELSE 0 END)
    INTO v_count, v_low_count
    FROM (
        SELECT score
        FROM risk_scores
        WHERE admission_id = p_admission_id
        ORDER BY calculated_at DESC
        LIMIT 3
    ) AS last_scores;

    RETURN (v_count = 3 AND v_low_count = 3);
END;
$$;

COMMENT ON FUNCTION suggest_discharge IS
    'Returns TRUE when the last 3 risk scores for an admission are all <= 2 (stable), suggesting the patient is ready for discharge';
