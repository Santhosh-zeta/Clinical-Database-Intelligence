-- ============================================================
-- Migration 022: Ward Handovers / Shift Notes
-- ============================================================

CREATE TABLE IF NOT EXISTS ward_handovers (
    id              SERIAL PRIMARY KEY,
    ward_id         INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    author_id       INT NOT NULL, -- User ID (Nurse/Doctor)
    shift_name      VARCHAR(50),  -- e.g. 'Morning', 'Night'
    summary         TEXT NOT NULL,
    patient_updates JSONB, -- Optional specific patient callouts
    organization_id INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handover_ward ON ward_handovers(ward_id, created_at DESC);
CREATE INDEX idx_handover_org  ON ward_handovers(organization_id);

COMMENT ON TABLE ward_handovers IS 'Shift-to-shift handover notes for nursing staff';
