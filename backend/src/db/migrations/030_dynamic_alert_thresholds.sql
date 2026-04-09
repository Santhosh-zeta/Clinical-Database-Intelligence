-- ============================================================
-- Migration 030: Dynamic Alert Thresholds
-- ============================================================

ALTER TABLE organization_settings
    ADD COLUMN hr_min          SMALLINT NOT NULL DEFAULT 50,
    ADD COLUMN hr_max          SMALLINT NOT NULL DEFAULT 130,
    ADD COLUMN spo2_min        NUMERIC(5,2) NOT NULL DEFAULT 95.0,
    ADD COLUMN bp_systolic_min SMALLINT NOT NULL DEFAULT 90,
    ADD COLUMN bp_systolic_max SMALLINT NOT NULL DEFAULT 150,
    ADD COLUMN temp_min        NUMERIC(4,1) NOT NULL DEFAULT 36.0,
    ADD COLUMN temp_max        NUMERIC(4,1) NOT NULL DEFAULT 38.5;

COMMENT ON COLUMN organization_settings.hr_min IS 'Heart Rate lower threshold (bpm)';
COMMENT ON COLUMN organization_settings.hr_max IS 'Heart Rate upper threshold (bpm)';
COMMENT ON COLUMN organization_settings.spo2_min IS 'SpO2 lower threshold (%)';
