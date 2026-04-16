INSERT INTO roles (name, description) VALUES
    ('ULTRA_ADMIN',    'Super administrator'),
    ('HOSPITAL_ADMIN', 'Hospital administrator'),
    ('DOCTOR',         'Clinical Doctor'),
    ('NURSE',          'Clinical Nurse'),
    ('PATIENT',        'Patient Access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('CREATE_ORG',           'Create hospitals/orgs'),
    ('MANAGE_ORG',           'Manage hospital details'),
    ('VIEW_ALL_PATIENTS',    'View all patients'),
    ('VIEW_OWN_PATIENT',     'View own patient records'),
    ('PRESCRIBE_MEDICATION', 'Prescribe medications'),
    ('DISCHARGE_PATIENT',    'Discharge a patient'),
    ('RECORD_VITALS',        'Record new vitals'),
    ('VIEW_AUDIT_LOGS',      'View system audit logs'),
    ('MANAGE_SETTINGS',      'System settings administration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('DOCTOR', 'doctor')
AND p.code IN ('VIEW_ALL_PATIENTS', 'PRESCRIBE_MEDICATION', 'VIEW_ALERTS', 'DISCHARGE_PATIENT')
ON CONFLICT DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('ULTRA_ADMIN',    'Super administrator'),
    ('HOSPITAL_ADMIN', 'Hospital administrator'),
    ('DOCTOR',         'Clinical Doctor'),
    ('NURSE',          'Clinical Nurse'),
    ('PATIENT',        'Patient Access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('CREATE_ORG',           'Create hospitals/orgs'),
    ('MANAGE_ORG',           'Manage hospital details'),
    ('VIEW_ALL_PATIENTS',    'View all patients'),
    ('VIEW_OWN_PATIENT',     'View own patient records'),
    ('PRESCRIBE_MEDICATION', 'Prescribe medications'),
    ('DISCHARGE_PATIENT',    'Discharge a patient'),
    ('RECORD_VITALS',        'Record new vitals'),
    ('VIEW_AUDIT_LOGS',      'View system audit logs'),
    ('MANAGE_SETTINGS',      'System settings administration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('DOCTOR', 'doctor')
AND p.code IN ('VIEW_ALL_PATIENTS', 'PRESCRIBE_MEDICATION', 'VIEW_ALERTS', 'DISCHARGE_PATIENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('NURSE', 'nurse')
AND p.code IN ('VIEW_ALL_PATIENTS', 'RECORD_VITALS', 'VIEW_ALERTS')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PATIENT'
AND p.code IN ('VIEW_OWN_PATIENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ULTRA_ADMIN', 'HOSPITAL_ADMIN')
ON CONFLICT DO NOTHING;

ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_role_check;

INSERT INTO doctors (name, email, password_hash, role, organization_id)
SELECT 'Demo Patient', 'patient@demo.com',
       COALESCE((SELECT password_hash FROM doctors WHERE email = 'doctor@demo.com' LIMIT 1), '\$2b\$10\$GLDiv6uy8Pf/qTCqMBSlBOwtmvnrHi2Ebfb/qE0Z3luOPaXoWieaS'),
       'PATIENT', 1
WHERE NOT EXISTS (
    SELECT 1 FROM doctors WHERE email = 'patient@demo.com'
);

INSERT INTO user_roles (doctor_id, role_id, org_id)
SELECT d.id, r.id, COALESCE(d.organization_id, 1)
FROM doctors d
JOIN roles r ON r.name = d.role
WHERE d.role = 'PATIENT'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('NURSE', 'nurse')
AND p.code IN ('VIEW_ALL_PATIENTS', 'RECORD_VITALS', 'VIEW_ALERTS')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PATIENT'
AND p.code IN ('VIEW_OWN_PATIENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ULTRA_ADMIN', 'HOSPITAL_ADMIN')
ON CONFLICT DO NOTHING;

ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_role_check;

INSERT INTO doctors (name, email, password_hash, role, organization_id)
SELECT 'Demo Patient', 'patient@demo.com',
       COALESCE((SELECT password_hash FROM doctors WHERE email = 'doctor@demo.com' LIMIT 1), '\$2b\$10\$GLDiv6uy8Pf/qTCqMBSlBOwtmvnrHi2Ebfb/qE0Z3luOPaXoWieaS'),
       'PATIENT', 1
WHERE NOT EXISTS (
    SELECT 1 FROM doctors WHERE email = 'patient@demo.com'
);

INSERT INTO user_roles (doctor_id, role_id, org_id)
SELECT d.id, r.id, COALESCE(d.organization_id, 1)
FROM doctors d
JOIN roles r ON r.name = d.role
WHERE d.role = 'PATIENT'
ON CONFLICT DO NOTHING;
