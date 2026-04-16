INSERT INTO permissions (code, description) VALUES
    ('VIEW_CONSULTS',    'View clinical consultation requests'),
    ('CREATE_CONSULT',  'Request a specialist consultation'),
    ('RESOLVE_CONSULT', 'Respond to or resolve a consultation request')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='admin'), id FROM permissions
    WHERE code IN ('VIEW_CONSULTS', 'CREATE_CONSULT', 'RESOLVE_CONSULT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='doctor'), id FROM permissions
    WHERE code IN ('VIEW_CONSULTS', 'CREATE_CONSULT', 'RESOLVE_CONSULT')
ON CONFLICT DO NOTHING;
