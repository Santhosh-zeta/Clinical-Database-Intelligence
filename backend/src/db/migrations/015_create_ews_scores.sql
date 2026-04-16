CREATE TABLE IF NOT EXISTS ews_scores (
    id                  BIGSERIAL,
    admission_id        INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id     INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,

    total_score         SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 20),
    rr_score            SMALLINT NOT NULL DEFAULT 0,
    spo2_score          SMALLINT NOT NULL DEFAULT 0,
    temp_score          SMALLINT NOT NULL DEFAULT 0,
    bp_score            SMALLINT NOT NULL DEFAULT 0,
    hr_score            SMALLINT NOT NULL DEFAULT 0,
    consciousness_score SMALLINT NOT NULL DEFAULT 0,

    category            VARCHAR(20) NOT NULL DEFAULT 'low'
                        CHECK (category IN ('low', 'medium', 'high', 'urgent')),

    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, calculated_at)
);

SELECT create_hypertable('ews_scores', 'calculated_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_ews_admission ON ews_scores(admission_id, calculated_at DESC);

COMMENT ON TABLE ews_scores IS 'NEWS2 Early Warning Score — international clinical standard (0-20 scale); populated by DB trigger after every vitals insert';
COMMENT ON COLUMN ews_scores.consciousness_score IS 'AVPU scale: 0=Alert, 3=Voice/Pain/Unresponsive; updated by bedside nurse assessment';
