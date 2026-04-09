'use strict';

const { Router } = require('express');
const { param, validationResult } = require('express-validator');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};


router.get('/', async (req, res, next) => {
    try {
        const { severity, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let sql = `
      SELECT al.*, p.name AS patient_name, a.admitted_at
      FROM alerts al
      JOIN admissions a ON a.id = al.admission_id
      JOIN patients   p ON p.id = a.patient_id
      WHERE al.is_acknowledged = FALSE
    `;
        const params = [];
        if (severity) { params.push(severity); sql += ` AND al.severity = $${params.length}`; }
        sql += ` ORDER BY al.triggered_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(sql, params);
        res.json({ data: result.rows, count: result.rowCount });
    } catch (err) { next(err); }
});


router.get('/:patient_id', param('patient_id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT al.*
       FROM alerts al
       JOIN admissions a ON a.id = al.admission_id
       WHERE a.patient_id = $1
       ORDER BY al.triggered_at DESC`,
            [req.params.patient_id]
        );
        res.json({ data: result.rows });
    } catch (err) { next(err); }
});


router.put('/:id/acknowledge', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const acknowledged_by = req.body.doctor_id || null;
        const result = await db.query(
            `UPDATE alerts
       SET is_acknowledged=TRUE, acknowledged_by=$1, acknowledged_at=NOW()
       WHERE id=$2 RETURNING *`,
            [acknowledged_by, req.params.id]
        );
        if (!result.rowCount) throw createError('Alert not found', 404);
        res.json({ data: result.rows[0], message: 'Alert acknowledged' });
    } catch (err) { next(err); }
});

module.exports = router;
