CREATE TABLE IF NOT EXISTS vitals (

    id              BIGSERIAL,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    heart_rate      SMALLINT,
    systolic_bp     SMALLINT,
    diastolic_bp    SMALLINT,
    spo2            NUMERIC(5,2),
    temperature     NUMERIC(4,1),
    respiratory_rate SMALLINT,
    blood_glucose   NUMERIC(6,2),

    recorded_by     INT REFERENCES doctors(id) ON DELETE SET NULL,
    notes           TEXT,

    PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable(
    'vitals',
    'recorded_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

ALTER TABLE vitals SET (timescaledb.compress, timescaledb.compress_orderby = 'recorded_at DESC', timescaledb.compress_segmentby = 'admission_id');

SELECT add_compression_policy('vitals', INTERVAL '7 days', if_not_exists => TRUE);

CREATE INDEX idx_vitals_admission ON vitals(admission_id, recorded_at DESC);

COMMENT ON TABLE vitals IS 'Time-series patient vitals stored as a TimescaleDB hypertable';
