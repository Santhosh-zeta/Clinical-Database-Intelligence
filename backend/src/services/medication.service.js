'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function listPending(orgId) {

    const result = await db.query(
        `SELECT * FROM v_pending_medications 
         WHERE organization_id = $1 
         AND (last_administered IS NULL OR last_administered < NOW() - INTERVAL '4 hours')
         ORDER BY ward_name, bed_number`,
        [orgId]
    );
    return result.rows;
}

async function administer(orgId, userId, { prescription_id, dose_given, notes, status = 'given' }) {

    const check = await db.query(
        'SELECT id, dose FROM prescriptions WHERE id = $1 AND organization_id = $2',
        [prescription_id, orgId]
    );
    if (!check.rowCount) throw createError('Prescription not found', 404);

    const result = await db.query(
        `INSERT INTO medication_administrations 
            (prescription_id, organization_id, administered_by, dose_given, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [prescription_id, orgId, userId, dose_given || check.rows[0].dose, notes, status]
    );

    return result.rows[0];
}

module.exports = { listPending, administer };
