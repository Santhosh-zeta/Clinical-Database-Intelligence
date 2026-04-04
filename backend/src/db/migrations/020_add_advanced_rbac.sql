-- ============================================================
-- Migration 020: Advanced RBAC Extension
-- ============================================================

-- 1. Safely add new uppercase roles
INSERT INTO roles (name, description) VALUES
    ('ULTRA_ADMIN',    'Super administrator'),
    ('HOSPITAL_ADMIN', 'Hospital administrator'),
    ('DOCTOR',         'Clinical Doctor'),
    ('NURSE',          'Clinical Nurse'),
    ('PATIENT',        'Patient Access')
ON CONFLICT (name) DO NOTHING;

-- 2. Add new permissions (Extending, not replacing)
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

-- 3. Map Roles to Permissions securely without deleting old ones
-- Map DOCTOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('DOCTOR', 'doctor')
AND p.code IN ('VIEW_ALL_PATIENTS', 'PRESCRIBE_MEDICATION', 'VIEW_ALERTS', 'DISCHARGE_PATIENT')
ON CONFLICT DO NOTHING;

-- Map NURSE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('NURSE', 'nurse')
AND p.code IN ('VIEW_ALL_PATIENTS', 'RECORD_VITALS', 'VIEW_ALERTS')
ON CONFLICT DO NOTHING;

-- Map PATIENT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'PATIENT'
AND p.code IN ('VIEW_OWN_PATIENT')
ON CONFLICT DO NOTHING;

-- Map ULTRA_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ULTRA_ADMIN', 'HOSPITAL_ADMIN')
ON CONFLICT DO NOTHING;

-- 4. Enable PATIENT logins via the doctors table to satisfy fast demo option B.
-- First, drop the check constraint on role to allow 'PATIENT' role
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_role_check;

INSERT INTO doctors (name, email, password_hash, role)
SELECT 'Demo Patient', 'patient@demo.com', 
       (SELECT password_hash FROM doctors WHERE email = 'doctor@demo.com' LIMIT 1), 
       'PATIENT'
WHERE NOT EXISTS (
    SELECT 1 FROM doctors WHERE email = 'patient@demo.com'
);

-- Ensure user_roles has the PATIENT mapping
INSERT INTO user_roles (doctor_id, role_id, org_id)
SELECT d.id, r.id, COALESCE(d.organization_id, 1)
FROM doctors d
JOIN roles r ON r.name = d.role
WHERE d.role = 'PATIENT'
ON CONFLICT DO NOTHING;
