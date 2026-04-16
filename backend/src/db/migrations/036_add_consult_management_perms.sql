INSERT INTO permissions (code, description) VALUES
    ('MANAGE_CONSULTS', 'Authorize and finalize clinical consultations (Admin)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT id, (SELECT id FROM permissions WHERE code='MANAGE_CONSULTS')
    FROM roles WHERE name IN ('admin', 'ultra_admin', 'hospital_admin')
ON CONFLICT DO NOTHING;
