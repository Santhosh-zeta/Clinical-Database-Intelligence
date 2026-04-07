'use strict';

const db = require('../config/db');

async function listAll(orgId) {
    const result = await db.query(
        `SELECT c.*, p.name as patient_name, d.name as doctor_name
         FROM clinical_consults c
         JOIN patients p ON p.id = c.patient_id
         JOIN doctors d ON d.id = c.requesting_dr_id
         WHERE c.organization_id = $1
         ORDER BY c.created_at DESC`,
        [orgId]
    );
    return result.rows;
}

async function create(orgId, userId, { patient_id, specialty, priority, reason }) {
    const result = await db.query(
        `INSERT INTO clinical_consults (organization_id, requesting_dr_id, patient_id, specialty, priority, reason)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [orgId, userId, patient_id, specialty, priority || 'routine', reason]
    );
    return result.rows[0];
}

async function resolve(orgId, userId, id, response) {
    const result = await db.query(
        `UPDATE clinical_consults 
         SET status = 'completed', responding_dr_id = $1, response = $2, resolved_at = NOW()
         WHERE id = $3 AND organization_id = $4 RETURNING *`,
        [userId, response, id, orgId]
    );
    return result.rows[0];
}

module.exports = { listAll, create, resolve };
