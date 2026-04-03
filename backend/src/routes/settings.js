'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// GET /api/settings/:key
router.get('/:key', async (req, res, next) => {
    try {
        const { key } = req.params;
        const result = await db.query(
            `SELECT value FROM system_configurations WHERE key = $1`,
            [key]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Configuration key not found' });
        }
        res.json({ data: result.rows[0].value });
    } catch (err) {
        next(err);
    }
});

// PUT /api/settings/:key
router.put(
    '/:key',
    [
        body().isObject().withMessage('Request body must be a JSON object')
    ],
    validate,
    async (req, res, next) => {
        try {
            const { key } = req.params;
            const updatedValue = req.body;
            
            const result = await db.query(
                `INSERT INTO system_configurations (key, value, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (key) DO UPDATE 
                 SET value = EXCLUDED.value, updated_at = NOW() 
                 RETURNING value`,
                [key, updatedValue]
            );
            
            res.json({
                message: 'Configuration updated successfully',
                data: result.rows[0].value
            });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
