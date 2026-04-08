'use strict';

const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const ctrl = require('../controllers/patient.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** GET  /api/patients            — list (search, paginate) */
router.get('/', requirePermission('VIEW_PATIENT'), ctrl.list);

/** POST /api/patients            — create */
router.post('/',
    requirePermission('CREATE_PATIENT'),
    [body('name').notEmpty().trim(), body('gender').isIn(['M', 'F', 'O'])],
    validate,
    ctrl.create
);

/** GET  /api/patients/:id        — get by ID */
router.get('/:id', requirePermission('VIEW_PATIENT'), ctrl.getById);

/** PUT  /api/patients/:id        — update */
router.put('/:id', requirePermission('UPDATE_PATIENT'), ctrl.update);

/** GET  /api/patients/:id/timeline — event timeline */
router.get('/:id/timeline', requirePermission('VIEW_TIMELINE'), ctrl.getTimeline);

/** POST /api/patients/:id/symptoms — record symptoms */
router.post('/:id/symptoms',
    requirePermission('UPDATE_PATIENT'),
    [body('symptoms').isArray({ min: 1 })],
    validate,
    ctrl.addSymptoms
);

/** GET  /api/patients/:id/appointments — scheduled appointments */
const db = require('../config/db');
router.get('/:id/appointments', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT a.*, d.name as doctor_name
             FROM patient_appointments a
             JOIN doctors d ON d.id = a.doctor_id
             WHERE a.patient_id = $1 AND a.organization_id = $2
             ORDER BY a.appointment_at ASC`,
            [req.params.id, req.orgId]
        );
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

/** GET  /api/patients/:id/admissions — admission history */
router.get('/:id/admissions', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT * FROM admissions WHERE patient_id = $1 AND organization_id = $2 ORDER BY admitted_at DESC`,
            [req.params.id, req.orgId]
        );
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

/** POST /api/patients/:id/appointments — book appointment */
router.post('/:id/appointments',
    requirePermission('UPDATE_PATIENT'),
    [
        body('doctor_id').isInt(),
        body('appointment_at').isISO8601(),
        body('reason').notEmpty()
    ],
    validate,
    ctrl.createAppointment
);

module.exports = router;
