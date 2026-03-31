-- ============================================================
-- Migration 007: Risk Scores
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_scores (
    id              SERIAL PRIMARY KEY,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    score           SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
    hr_score        SMALLINT,           -- sub-score for heart rate
    bp_score        SMALLINT,           -- sub-score for blood pressure
    spo2_score      SMALLINT,           -- sub-score for oxygen saturation
    temp_score      SMALLINT,           -- sub-score for temperature
    category        VARCHAR(20) NOT NULL DEFAULT 'stable'
                    CHECK (category IN ('stable', 'moderate', 'high', 'critical')),
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_admission   ON risk_scores(admission_id, calculated_at DESC);

COMMENT ON TABLE risk_scores IS 'Computed composite risk scores per admission; populated by DB triggers';
