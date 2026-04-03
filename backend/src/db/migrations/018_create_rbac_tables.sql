-- ============================================================
-- Migration 018: Full RBAC Tables
-- roles, permissions, role_permissions, user_roles
-- Replaces the simple role column with granular permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id         SERIAL PRIMARY KEY,
    doctor_id  INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    role_id    INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    org_id     INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (doctor_id, role_id, org_id)
);

-- Indexes for critical permission lookup path
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(doctor_id, org_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_role   ON role_permissions(role_id);

-- ── Seed Standard Roles ──────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
    ('admin',      'Hospital administrator — full access'),
    ('doctor',     'Attending physician — clinical access'),
    ('nurse',      'Nursing staff — monitoring and recording'),
    ('head_nurse', 'Senior nurse — extended management permissions')
ON CONFLICT (name) DO NOTHING;

-- ── Seed All Permission Codes ─────────────────────────────────────────────────
INSERT INTO permissions (code, description) VALUES
    ('VIEW_PATIENT',        'View patient demographics'),
    ('CREATE_PATIENT',      'Register a new patient'),
    ('UPDATE_PATIENT',      'Update patient demographics'),
    ('VIEW_VITALS',         'View vital signs history'),
    ('RECORD_VITALS',       'Submit a new vitals reading'),
    ('VIEW_ALERTS',         'View clinical alerts'),
    ('ACKNOWLEDGE_ALERT',   'Acknowledge or dismiss an alert'),
    ('VIEW_ADMISSIONS',     'View admission records'),
    ('CREATE_ADMISSION',    'Admit a patient'),
    ('DISCHARGE_PATIENT',   'Discharge a patient'),
    ('VIEW_PRESCRIPTIONS',  'View prescriptions'),
    ('CREATE_PRESCRIPTION', 'Issue a prescription'),
    ('CANCEL_PRESCRIPTION', 'Cancel an active prescription'),
    ('VIEW_DIAGNOSES',      'View clinical diagnoses'),
    ('CREATE_DIAGNOSIS',    'Record a diagnosis'),
    ('VIEW_ICU',            'View ICU allocation'),
    ('MANAGE_ICU',          'Modify ICU bed assignments'),
    ('VIEW_DASHBOARD',      'Access admin dashboard KPIs'),
    ('VIEW_AUDIT_LOGS',     'View audit trail (compliance)'),
    ('MANAGE_STAFF',        'Create and update staff accounts'),
    ('MANAGE_SETTINGS',     'Update organization settings'),
    ('VIEW_TIMELINE',       'View patient event timeline')
ON CONFLICT (code) DO NOTHING;

-- ── Admin: all permissions ────────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='admin'), id FROM permissions
ON CONFLICT DO NOTHING;

-- ── Doctor: clinical permissions ─────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='doctor'), id FROM permissions
    WHERE code IN (
        'VIEW_PATIENT','CREATE_PATIENT','UPDATE_PATIENT',
        'VIEW_VITALS','RECORD_VITALS',
        'VIEW_ALERTS','ACKNOWLEDGE_ALERT',
        'VIEW_ADMISSIONS','CREATE_ADMISSION','DISCHARGE_PATIENT',
        'VIEW_PRESCRIPTIONS','CREATE_PRESCRIPTION','CANCEL_PRESCRIPTION',
        'VIEW_DIAGNOSES','CREATE_DIAGNOSIS',
        'VIEW_ICU','MANAGE_ICU',
        'VIEW_DASHBOARD','VIEW_TIMELINE'
    )
ON CONFLICT DO NOTHING;

-- ── Nurse: monitoring + recording ────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='nurse'), id FROM permissions
    WHERE code IN (
        'VIEW_PATIENT','VIEW_VITALS','RECORD_VITALS',
        'VIEW_ALERTS','ACKNOWLEDGE_ALERT',
        'VIEW_ADMISSIONS','VIEW_PRESCRIPTIONS',
        'VIEW_DIAGNOSES','VIEW_ICU','VIEW_TIMELINE'
    )
ON CONFLICT DO NOTHING;

-- ── Head Nurse: nurse + management ───────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='head_nurse'), id FROM permissions
    WHERE code IN (
        'VIEW_PATIENT','VIEW_VITALS','RECORD_VITALS',
        'VIEW_ALERTS','ACKNOWLEDGE_ALERT',
        'VIEW_ADMISSIONS','VIEW_PRESCRIPTIONS','CANCEL_PRESCRIPTION',
        'VIEW_DIAGNOSES','VIEW_ICU','MANAGE_ICU',
        'VIEW_DASHBOARD','VIEW_TIMELINE','MANAGE_STAFF'
    )
ON CONFLICT DO NOTHING;

-- ── Migrate existing doctors' role column → user_roles ───────────────────────
INSERT INTO user_roles (doctor_id, role_id, org_id)
    SELECT d.id, r.id, COALESCE(d.organization_id, 1)
    FROM doctors d
    JOIN roles r ON r.name = d.role
ON CONFLICT DO NOTHING;

COMMENT ON TABLE roles IS 'Named roles in the RBAC system';
COMMENT ON TABLE permissions IS 'Granular permission codes checked by requirePermission() middleware';
COMMENT ON TABLE user_roles IS 'Org-scoped assignment of roles to staff members';
