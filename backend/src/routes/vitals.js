'use strict';

const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};


router.post(
    '/',
    [
        body('admission_id').isInt(),
        body('heart_rate').optional().isInt({ min: 0, max: 300 }),
        body('systolic_bp').optional().isInt({ min: 0, max: 300 }),
        body('diastolic_bp').optional().isInt({ min: 0, max: 200 }),
        body('spo2').optional().isFloat({ min: 0, max: 100 }),
        body('temperature').optional().isFloat({ min: 20, max: 50 }),
        body('respiratory_rate').optional().isInt({ min: 0, max: 100 }),
        body('blood_glucose').optional().isFloat({ min: 0 }),
    ],
    validate,
    async (req, res, next) => {
        try {
            const {
                admission_id, heart_rate, systolic_bp, diastolic_bp,
                spo2, temperature, respiratory_rate, blood_glucose,
                recorded_by, notes,
            } = req.body;

            const result = await db.query(
                `INSERT INTO vitals
         (admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
          respiratory_rate, blood_glucose, recorded_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
                [admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
                    respiratory_rate, blood_glucose, recorded_by, notes]
            );

            res.status(201).json({
                data: result.rows[0],
                message: 'Vitals recorded. Risk scoring trigger has fired.',
            });
        } catch (err) { next(err); }
    }
);


router.get(
    '/:patient_id',
    [
        param('patient_id').isInt(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601(),
        query('limit').optional().isInt({ min: 1, max: 1000 }),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { patient_id } = req.params;
            const { from, to, limit = 100 } = req.query;

            let sql = `
        SELECT v.*
        FROM vitals v
        JOIN admissions a ON a.id = v.admission_id
        WHERE a.patient_id = $1
      `;
            const params = [patient_id];
            if (from) { params.push(from); sql += ` AND v.recorded_at >= $${params.length}`; }
            if (to) { params.push(to); sql += ` AND v.recorded_at <= $${params.length}`; }
            sql += ` ORDER BY v.recorded_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const result = await db.query(sql, params);
            res.json({ data: result.rows, count: result.rowCount });
        } catch (err) { next(err); }
    }
);


router.get('/:patient_id/latest', param('patient_id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT v.*
       FROM vitals v
       JOIN admissions a ON a.id = v.admission_id
       WHERE a.patient_id = $1 AND a.status = 'active'
       ORDER BY v.recorded_at DESC
       LIMIT 1`,
            [req.params.patient_id]
        );
        if (!result.rowCount) throw createError('No vitals found', 404);
        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
