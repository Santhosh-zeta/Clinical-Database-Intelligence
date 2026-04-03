'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
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

        if (!result.rowCount) throw createError('Invalid credentials', 401);

        const doctor = result.rows[0];
        const match  = await bcrypt.compare(password, doctor.password_hash);
        if (!match) throw createError('Invalid credentials', 401);

        const payload = {
            id:     doctor.id,
            name:   doctor.name,
            role:   doctor.role,
            org_id: doctor.organization_id,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload });
    } catch (err) { next(err); }
};

module.exports = { login };
