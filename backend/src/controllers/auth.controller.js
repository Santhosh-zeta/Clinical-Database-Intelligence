'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start insecurely.');
    process.exit(1);
}

// Demo credentials for development/demo environments only.
// In production, set NODE_ENV=production to disable this bypass.
const DEMO_ACCOUNTS = {
    'a1@intellicare.demo': { role: 'admin',   id: 9001, name: 'Demo Admin'  },
    'd1@intellicare.demo': { role: 'doctor',  id: 9002, name: 'Demo Doctor' },
    'n1@intellicare.demo': { role: 'nurse',   id: 9003, name: 'Demo Nurse'  },
    'p1@intellicare.demo': { role: 'patient', id: 9004, name: 'Demo Patient', patientId: 1 },
};
const DEMO_PASSWORD  = process.env.DEMO_PASSWORD || 'password123';
const DEMO_ENABLED   = process.env.NODE_ENV !== 'production';

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw createError('Email and password are required', 400);

        const result = await db.query(
            `SELECT d.id, d.name, d.email, d.password_hash, d.role, d.organization_id, d.patient_id
             FROM doctors d WHERE d.email = $1 AND d.is_active = TRUE`,
            [email]
        );

        if (!result.rowCount) {
            // Demo account fallback — only in non-production environments
            if (DEMO_ENABLED && DEMO_ACCOUNTS[email] && password === DEMO_PASSWORD) {
                const demo = DEMO_ACCOUNTS[email];
                const payload = {
                    id: demo.id,
                    name: demo.name,
                    role: demo.role,
                    org_id: 1,
                    patientId: demo.patientId || null,
                    permissions: demo.role === 'admin' ? ['*'] : [],
                    is_demo: true,
                };
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
                return res.json({ token, user: payload });
            }
            throw createError('Invalid credentials', 401);
        }

        const doctor = result.rows[0];
        const match = await bcrypt.compare(password, doctor.password_hash);
        if (!match) throw createError('Invalid credentials', 401);

        const permsResult = await db.query(
            `SELECT p.code
             FROM user_roles ur
             JOIN role_permissions rp ON rp.role_id = ur.role_id
             JOIN permissions p ON p.id = rp.permission_id
             WHERE ur.doctor_id = $1`,
            [doctor.id]
        );
        const permissions = permsResult.rows.map(r => r.code);

        const payload = {
            id: doctor.id,
            name: doctor.name,
            role: doctor.role,
            org_id: doctor.organization_id,
            patientId: doctor.patient_id,
            permissions: permissions
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload });
    } catch (err) { next(err); }
};

module.exports = { login };
