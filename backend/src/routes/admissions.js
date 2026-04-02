'use strict';

const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// ── POST /api/admissions ───────────────────────────────────────────────────
// Admits a patient. Bed trigger fires to mark bed as occupied.
router.post(
    '/',
    [
        body('patient_id').isInt(),
        body('doctor_id').isInt(),
        body('ward_id').optional().isInt(),
        body('bed_id').optional().isInt(),
        body('diagnosis').optional().isString(),
    ],
    validate,
    async (req, res, next) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Verify bed is free
            if (req.body.bed_id) {
                const bedCheck = await client.query('SELECT is_occupied FROM beds WHERE id=$1', [req.body.bed_id]);
                if (bedCheck.rows[0]?.is_occupied) {
                    throw createError('Bed is already occupied', 409);
                }
            }

            const { patient_id, doctor_id, ward_id, bed_id, diagnosis, notes } = req.body;
            const result = await client.query(
                `INSERT INTO admissions (patient_id, doctor_id, ward_id, bed_id, diagnosis, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [patient_id, doctor_id, ward_id, bed_id, diagnosis, notes]
            );

            await client.query('COMMIT');
            res.status(201).json({ data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            next(err);
        } finally {
            client.release();
        }
    }
);

// ── GET /api/admissions/:id ────────────────────────────────────────────────
router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT a.*,
              p.name AS patient_name, p.date_of_birth, p.blood_group,
              d.name AS doctor_name,
              w.name AS ward_name, w.ward_type,
              b.bed_number,
              rs.score AS latest_risk_score, rs.category AS risk_category
       FROM admissions a
       JOIN patients p  ON p.id = a.patient_id
       JOIN doctors d   ON d.id = a.doctor_id
       LEFT JOIN wards w ON w.id = a.ward_id
       LEFT JOIN beds  b ON b.id = a.bed_id
       LEFT JOIN LATERAL (
           SELECT score, category FROM risk_scores
           WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
       ) rs ON TRUE
       WHERE a.id = $1`,
            [req.params.id]
        );
        if (!result.rowCount) throw createError('Admission not found', 404);
        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
});

// ── GET /api/admissions (active only by default) ───────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { status = 'active', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const result = await db.query(
            `SELECT a.id, a.patient_id, a.admitted_at, a.status, a.diagnosis,
              p.gender, p.date_of_birth,
              p.name AS patient_name, d.name AS doctor_name,
              w.name AS ward_name, b.bed_number,
              rs.score AS risk_score, rs.category AS risk_category
       FROM admissions a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors  d ON d.id = a.doctor_id
       LEFT JOIN wards w ON w.id = a.ward_id
       LEFT JOIN beds  b ON b.id = a.bed_id
       LEFT JOIN LATERAL (
           SELECT score, category FROM risk_scores
           WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
       ) rs ON TRUE
       WHERE a.status = $1
       ORDER BY a.admitted_at DESC
       LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );
        res.json({ data: result.rows, count: result.rowCount });
    } catch (err) { next(err); }
});

// ── PUT /api/admissions/:id/discharge ──────────────────────────────────────
// Discharges patient. Bed trigger fires to free the bed.
router.put('/:id/discharge', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query(
            `UPDATE admissions
       SET status='discharged', discharged_at=NOW(), updated_at=NOW(),
           notes = COALESCE(notes,'') || $1
       WHERE id=$2 AND status='active'
       RETURNING *`,
            [req.body.discharge_notes ? `\nDischarge notes: ${req.body.discharge_notes}` : '', req.params.id]
        );
        if (!result.rowCount) throw createError('Active admission not found', 404);
        res.json({ data: result.rows[0], message: 'Patient discharged successfully' });
    } catch (err) { next(err); }
});

// ── GET /api/admissions/:id/discharge-ready ────────────────────────────────
// Calls suggest_discharge() DB function
router.get('/:id/discharge-ready', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query('SELECT suggest_discharge($1) AS discharge_ready', [req.params.id]);
        res.json({ discharge_ready: result.rows[0].discharge_ready });
    } catch (err) { next(err); }
});

module.exports = router;
