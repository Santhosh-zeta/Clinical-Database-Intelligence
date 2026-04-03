'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function list(orgId, { severity, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const params = [orgId];
    let sql = `
        SELECT al.*, p.name AS patient_name, a.admitted_at
        FROM alerts al
        JOIN admissions a ON a.id = al.admission_id
        JOIN patients   p ON p.id = a.patient_id
        WHERE al.organization_id = $1 AND al.is_acknowledged = FALSE
    `;
    if (severity) { params.push(severity); sql += ` AND al.severity = $${params.length}`; }
    sql += ` ORDER BY al.triggered_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await db.query(sql, params);
    return { rows: result.rows, count: result.rowCount };
}

async function listByPatient(patientId, orgId) {
    const result = await db.query(
        `SELECT al.* FROM alerts al
         JOIN admissions a ON a.id = al.admission_id
         WHERE a.patient_id = $1 AND al.organization_id = $2
         ORDER BY al.triggered_at DESC`,
        [patientId, orgId]
    );
    return result.rows;
}

async function acknowledge(id, doctorId, orgId) {
    const result = await db.query(
        `UPDATE alerts
         SET is_acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW(), status = 'acknowledged'
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [doctorId, id, orgId]
    );
    if (!result.rowCount) throw createError('Alert not found', 404);
    return result.rows[0];
}

async function runEscalation() {
    const result = await db.query('SELECT escalate_unacknowledged_alerts() AS escalated');
    return result.rows[0].escalated;
}

async function deduplicateAlerts() {
    const result = await db.query('SELECT cleanup_duplicate_alerts() AS removed');
    return result.rows[0].removed;
}

module.exports = { list, listByPatient, acknowledge, runEscalation, deduplicateAlerts };
