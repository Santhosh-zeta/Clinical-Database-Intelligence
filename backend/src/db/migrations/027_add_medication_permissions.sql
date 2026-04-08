-- ============================================================
-- Migration 027: Medication Administration Permissions
-- ============================================================

INSERT INTO permissions (code, description) VALUES
    ('ADMINISTER_MEDICATION', 'Track medication administration to patients')
ON CONFLICT (code) DO NOTHING;

-- Assign to Nurse
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='nurse'), id FROM permissions
    WHERE code = 'ADMINISTER_MEDICATION'
ON CONFLICT DO NOTHING;

-- Assign to Head Nurse
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='head_nurse'), id FROM permissions
    WHERE code = 'ADMINISTER_MEDICATION'
ON CONFLICT DO NOTHING;

-- Assign to Admin
INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='admin'), id FROM permissions
    WHERE code = 'ADMINISTER_MEDICATION'
ON CONFLICT DO NOTHING;
