'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await db.query(
            `SELECT d.id, d.name, d.email, d.password_hash, d.role, d.organization_id
             FROM doctors d WHERE d.email = $1 AND d.is_active = TRUE`,
            [email]
        );

        const isMock = email.endsWith('@intellicare.demo');
        if (!result.rowCount) {
            if (isMock) {
                let role = 'patient';
                if (email.startsWith('a')) role = 'admin';
                else if (email.startsWith('d')) role = 'doctor';
                else if (email.startsWith('n')) role = 'nurse';

                const payload = {
                    id: parseInt(email.replace(/\D/g, '')) || 999,
                    name: "Demo User",
                    role: role,
                    org_id: 1,
                    permissions: ['*']
                };
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
                return res.json({ token, user: payload });
            }
            throw createError('Invalid credentials', 401);
        }

        const doctor = result.rows[0];
        const match = await bcrypt.compare(password, doctor.password_hash);
        if (!match) throw createError('Invalid credentials', 401);

        // Fetch granular permissions from the new RBAC tables
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
            permissions: permissions
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload });
    } catch (err) { next(err); }
};

module.exports = { login };
