'use strict';

const db = require('../config/db');

async function list(doctorId, orgId, { unreadOnly = false, page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
    const params = [doctorId, orgId];
    let sql = `
        SELECT n.*, p.name AS patient_name
        FROM notifications n
        JOIN admissions a ON a.id = n.admission_id
        JOIN patients   p ON p.id = a.patient_id
        WHERE n.doctor_id = $1 AND a.organization_id = $2
    `;
    if (unreadOnly) sql += ` AND n.is_read = FALSE`;
    sql += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await db.query(sql, params);
    return { rows: result.rows, count: result.rowCount };
}

async function markRead(id, doctorId) {
    await db.query(
        'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND doctor_id=$2',
        [id, doctorId]
    );
}

async function markAllRead(doctorId) {
    const result = await db.query(
        'UPDATE notifications SET is_read=TRUE WHERE doctor_id=$1 AND is_read=FALSE',
        [doctorId]
    );
    return result.rowCount;
}

module.exports = { list, markRead, markAllRead };
