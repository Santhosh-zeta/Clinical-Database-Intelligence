-- ============================================================
-- Migration 015: EWS Scores (NEWS2 — National Early Warning Score 2)
-- Industry-standard clinical scoring: 0-20 scale
-- Stored as TimescaleDB hypertable (same pattern as vitals)
-- ============================================================

CREATE TABLE IF NOT EXISTS ews_scores (
    id                  BIGSERIAL,
    admission_id        INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id     INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,

    -- NEWS2 sub-scores (each 0-3)
    total_score         SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 20),
    rr_score            SMALLINT NOT NULL DEFAULT 0,   -- Respiratory Rate
    spo2_score          SMALLINT NOT NULL DEFAULT 0,   -- Oxygen Saturation
    temp_score          SMALLINT NOT NULL DEFAULT 0,   -- Temperature
    bp_score            SMALLINT NOT NULL DEFAULT 0,   -- Systolic BP
    hr_score            SMALLINT NOT NULL DEFAULT 0,   -- Heart Rate
    consciousness_score SMALLINT NOT NULL DEFAULT 0,   -- AVPU (0=Alert, 3=CVPU)

    -- Clinical category (org-configurable thresholds)
    category            VARCHAR(20) NOT NULL DEFAULT 'low'
                        CHECK (category IN ('low', 'medium', 'high', 'urgent')),

    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, calculated_at)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('ews_scores', 'calculated_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_ews_admission ON ews_scores(admission_id, calculated_at DESC);

COMMENT ON TABLE ews_scores IS 'NEWS2 Early Warning Score — international clinical standard (0-20 scale); populated by DB trigger after every vitals insert';
COMMENT ON COLUMN ews_scores.consciousness_score IS 'AVPU scale: 0=Alert, 3=Voice/Pain/Unresponsive; updated by bedside nurse assessment';
