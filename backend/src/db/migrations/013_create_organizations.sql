-- ============================================================
-- Migration 013: Organizations (Multi-Tenant Root)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    type        VARCHAR(30) NOT NULL DEFAULT 'hospital'
                CHECK (type IN ('hospital', 'clinic', 'diagnostic_center')),
    slug        VARCHAR(50) UNIQUE NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-organization configurable settings (white-label SaaS key)
CREATE TABLE IF NOT EXISTS organization_settings (
    org_id                  INT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    ews_high_threshold      SMALLINT NOT NULL DEFAULT 5,    -- EWS score → high risk
    ews_urgent_threshold    SMALLINT NOT NULL DEFAULT 7,    -- EWS score → urgent/ICU
    alert_cooldown_minutes  SMALLINT NOT NULL DEFAULT 15,   -- Deduplication window
    icu_auto_assign         BOOLEAN  NOT NULL DEFAULT TRUE,  -- Auto-escalate to ICU?
    escalation_wait_minutes SMALLINT NOT NULL DEFAULT 10,   -- Alert escalation delay
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default organization (all existing data maps to org_id = 1)
INSERT INTO organizations (id, name, type, slug)
VALUES (1, 'Default Hospital', 'hospital', 'default-hospital')
ON CONFLICT (id) DO NOTHING;

-- Seed default org settings
INSERT INTO organization_settings (org_id) VALUES (1)
ON CONFLICT (org_id) DO NOTHING;

COMMENT ON TABLE organizations IS 'Root tenant entity — each hospital/clinic is an organization';
COMMENT ON TABLE organization_settings IS 'Per-org configurable thresholds and behavior flags (SaaS white-label)';
