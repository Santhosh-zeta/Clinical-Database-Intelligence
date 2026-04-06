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

module.exports = { listAll };
