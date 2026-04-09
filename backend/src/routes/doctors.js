'use strict';

const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
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
        body('name').notEmpty().trim(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('role').optional().isIn(['doctor', 'nurse', 'admin']),
        body('department_id').optional().isInt(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, email, password, role, specialization, department_id, phone } = req.body;
            const password_hash = await bcrypt.hash(password, 12);
            const result = await db.query(
                `INSERT INTO doctors (name, email, password_hash, role, specialization, department_id, phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, email, role, specialization, department_id, phone, created_at`,
                [name, email, password_hash, role || 'doctor', specialization, department_id, phone]
            );
            res.status(201).json({ data: result.rows[0] });
        } catch (err) {
            if (err.code === '23505') return next(createError('Email already registered', 409));
            next(err);
        }
    }
);


router.get('/', async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT d.id, d.name, d.email, d.role, d.specialization, d.phone, d.is_active,
              dept.name AS department_name
       FROM doctors d
       LEFT JOIN departments dept ON dept.id = d.department_id
       ORDER BY d.name`
        );
        res.json({ data: result.rows });
    } catch (err) { next(err); }
});


router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT d.id, d.name, d.email, d.role, d.specialization, d.phone, d.is_active,
              dept.name AS department_name
       FROM doctors d
       LEFT JOIN departments dept ON dept.id = d.department_id
       WHERE d.id = $1`,
            [req.params.id]
        );
        if (!result.rowCount) throw createError('Doctor not found', 404);
        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
