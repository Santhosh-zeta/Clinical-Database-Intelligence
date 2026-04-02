-- ============================================================
-- Migration 006: Vitals (TimescaleDB Hypertable)
-- ============================================================

-- Requires TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS vitals (
    -- TimescaleDB requires the time column to be part of PK for newer versions
    id              BIGSERIAL,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Core vitals
    heart_rate      SMALLINT,           -- bpm
    systolic_bp     SMALLINT,           -- mmHg
    diastolic_bp    SMALLINT,           -- mmHg
    spo2            NUMERIC(5,2),       -- % oxygen saturation
    temperature     NUMERIC(4,1),       -- °C
    respiratory_rate SMALLINT,          -- breaths/min
    blood_glucose   NUMERIC(6,2),       -- mg/dL

    -- Source metadata
    recorded_by     INT REFERENCES doctors(id) ON DELETE SET NULL,
    notes           TEXT,

    PRIMARY KEY (id, recorded_at)
);

-- Convert to TimescaleDB hypertable; chunk every 1 day for ICU-level data volume
SELECT create_hypertable(
    'vitals',
    'recorded_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Enable compression on the hypertable first
ALTER TABLE vitals SET (timescaledb.compress, timescaledb.compress_orderby = 'recorded_at DESC', timescaledb.compress_segmentby = 'admission_id');

-- Compression policy: compress chunks older than 7 days
SELECT add_compression_policy('vitals', INTERVAL '7 days', if_not_exists => TRUE);

CREATE INDEX idx_vitals_admission ON vitals(admission_id, recorded_at DESC);

COMMENT ON TABLE vitals IS 'Time-series patient vitals stored as a TimescaleDB hypertable';
