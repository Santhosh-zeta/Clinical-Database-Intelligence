'use strict';

const db = require('../config/db');

async function listByWard(wardId, orgId) {
    const result = await db.query(
        `SELECT h.*, d.name as author_name
         FROM ward_handovers h
         JOIN doctors d ON d.id = h.author_id -- Simplified, assuming users are the doctors/staff
         WHERE h.ward_id = $1 AND h.organization_id = $2
         ORDER BY h.created_at DESC LIMIT 50`,
        [wardId, orgId]
    );
    return result.rows;
}

async function create(body, orgId, authorId) {
    const { ward_id, shift_name, summary, patient_updates } = body;
    const result = await db.query(
        `INSERT INTO ward_handovers (ward_id, author_id, shift_name, summary, patient_updates, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [ward_id, authorId, shift_name, summary, JSON.stringify(patient_updates || {}), orgId]
    );
    return result.rows[0];
}

module.exports = { listByWard, create };
