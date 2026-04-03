'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function list(orgId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const result = await db.query(
        `SELECT d.id, d.name, d.email, d.role, d.specialization, d.phone, d.is_active,
                dept.name AS department_name, d.organization_id
         FROM doctors d
         LEFT JOIN departments dept ON dept.id = d.department_id
         WHERE d.organization_id = $1
         ORDER BY d.name
         LIMIT $2 OFFSET $3`,
        [orgId, limit, offset]
    );
    return result.rows;
}

async function getById(id, orgId) {
    const result = await db.query(
        `SELECT d.id, d.name, d.email, d.role, d.specialization, d.phone, d.is_active,
                dept.name AS department_name
         FROM doctors d
         LEFT JOIN departments dept ON dept.id = d.department_id
         WHERE d.id = $1 AND d.organization_id = $2`,
        [id, orgId]
    );
    if (!result.rowCount) throw createError('Doctor not found', 404);
    return result.rows[0];
}

async function create(body, orgId) {
    const bcrypt = require('bcryptjs');
    const { name, email, password, role = 'doctor', specialization, department_id, phone } = body;
    const password_hash = await bcrypt.hash(password, 12);
    try {
        const result = await db.query(
            `INSERT INTO doctors (name, email, password_hash, role, specialization, department_id, phone, organization_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id, name, email, role, specialization, department_id, phone, created_at`,
            [name, email, password_hash, role, specialization, department_id, phone, orgId]
        );
        // Assign role in user_roles table
        await db.query(
            `INSERT INTO user_roles (doctor_id, role_id, org_id)
             SELECT $1, r.id, $2 FROM roles r WHERE r.name = $3 ON CONFLICT DO NOTHING`,
            [result.rows[0].id, orgId, role]
        );
        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') throw createError('Email already registered', 409);
        throw err;
    }
}

module.exports = { list, getById, create };
