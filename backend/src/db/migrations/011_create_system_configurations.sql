-- ============================================================
-- Migration 011: System Configurations
-- ============================================================

CREATE TABLE IF NOT EXISTS system_configurations (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial thresholds for intelligence engine
INSERT INTO system_configurations (key, value)
VALUES (
    'clinical_thresholds',
    '{"hrMax": 140, "hrMin": 40, "sysMax": 180, "spo2Min": 85, "tempMax": 40.0, "sysMin": 70, "tempMin": 34.0}'
)
ON CONFLICT (key) DO NOTHING;
