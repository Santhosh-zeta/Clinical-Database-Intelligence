'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** GET /api/appointments - List all appointments for staff */
router.get('/', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT a.*, p.name as patient_name, d.name as doctor_name
             FROM patient_appointments a
             JOIN patients p ON p.id = a.patient_id
             JOIN doctors d ON d.id = a.doctor_id
             WHERE a.organization_id = $1
             ORDER BY a.appointment_at ASC`,
            [req.orgId]
        );
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

/** PUT /api/appointments/:id/status - Update appointment status */
router.put('/:id/status',
    requirePermission('UPDATE_PATIENT'),
    [body('status').isIn(['scheduled', 'cancelled', 'completed'])],
    validate,
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const result = await db.query(
                `UPDATE patient_appointments SET status = $1 
                 WHERE id = $2 AND organization_id = $3 RETURNING *`,
                [status, id, req.orgId]
            );
            if (!result.rowCount) return res.status(404).json({ error: 'Appointment not found' });
            res.json({ data: result.rows[0] });
        } catch (e) { next(e); }
    }
);

module.exports = router;
