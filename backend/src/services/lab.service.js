'use strict';

const db = require('../config/db');

async function listByAdmission(admissionId, orgId) {
    const orders = await db.query(
        `SELECT lo.*, lt.name as test_name, lt.category, lt.normal_range, d.name as doctor_name
         FROM lab_orders lo
         JOIN lab_tests lt ON lt.id = lo.test_id
         LEFT JOIN doctors d ON d.id = lo.doctor_id
         WHERE lo.admission_id = $1 AND lo.organization_id = $2
         ORDER BY lo.ordered_at DESC`,
        [admissionId, orgId]
    );

    const results = await db.query(
        `SELECT lr.*, lt.name as test_name, d.name as technician_name
         FROM lab_results lr
         JOIN lab_tests lt ON lt.id = lr.test_id
         LEFT JOIN doctors d ON d.id = lr.technician_id
         JOIN lab_orders lo ON lo.id = lr.order_id
         WHERE lo.admission_id = $1 AND lr.organization_id = $2
         ORDER BY lr.verified_at DESC`,
        [admissionId, orgId]
    );

    return { orders: orders.rows, results: results.rows };
}

async function createOrder(admissionId, orgId, doctorId, testId, priority = 'routine') {
    const result = await db.query(
        `INSERT INTO lab_orders (admission_id, organization_id, doctor_id, test_id, priority)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [admissionId, orgId, doctorId, testId, priority]
    );
    return result.rows[0];
}

async function listTests() {
    const result = await db.query('SELECT * FROM lab_tests ORDER BY category, name');
    return result.rows;
}

module.exports = { listByAdmission, createOrder, listTests };
