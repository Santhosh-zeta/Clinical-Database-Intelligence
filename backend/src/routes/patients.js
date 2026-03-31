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

// ── POST /api/patients ─────────────────────────────────────────────────────
router.post(
    '/',
    [
        body('name').notEmpty().trim(),
        body('date_of_birth').isDate(),
        body('gender').isIn(['M', 'F', 'O']),
        body('blood_group').optional().isString(),
        body('contact').optional().isString(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions } = req.body;
            const result = await db.query(
                `INSERT INTO patients (name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
                [name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions]
            );
            res.status(201).json({ data: result.rows[0] });
        } catch (err) { next(err); }
    }
);

// ── GET /api/patients ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let queryStr = 'SELECT * FROM patients';
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            queryStr += ` WHERE name ILIKE $1`;
        }
        queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await db.query(queryStr, params);
        res.json({ data: result.rows, count: result.rowCount });
    } catch (err) { next(err); }
});

// ── GET /api/patients/:id ──────────────────────────────────────────────────
router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        if (!result.rowCount) throw createError('Patient not found', 404);
        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
});

// ── PUT /api/patients/:id ──────────────────────────────────────────────────
router.put('/:id', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const { name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions } = req.body;
        const result = await db.query(
            `UPDATE patients SET name=$1, date_of_birth=$2, gender=$3, blood_group=$4,
       contact=$5, emergency_contact=$6, address=$7, allergies=$8,
       chronic_conditions=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
            [name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions, req.params.id]
        );
        if (!result.rowCount) throw createError('Patient not found', 404);
        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
