ALTER TABLE departments  ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE doctors      ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE patients     ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE wards        ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE beds         ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE admissions   ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE RESTRICT DEFAULT 1;
ALTER TABLE alerts       ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1;
ALTER TABLE audit_logs   ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1;
ALTER TABLE audit_logs   ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);

UPDATE departments SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE doctors     SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE patients    SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE wards       SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE beds        SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE admissions  SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE alerts      SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE audit_logs  SET organization_id = 1 WHERE organization_id IS NULL;

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'acknowledged', 'resolved', 'escalated'));
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalation_level SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalated_at      TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

UPDATE alerts SET status = 'acknowledged' WHERE is_acknowledged = TRUE AND status = 'active';

COMMENT ON COLUMN alerts.status IS 'Alert lifecycle: active → acknowledged/escalated → resolved';
COMMENT ON COLUMN alerts.escalation_level IS '1=primary doctor, 2=senior, 3=dept head';
COMMENT ON COLUMN organization_settings.icu_auto_assign IS 'When FALSE, ICU escalation requires manual approval';
