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

router.get('/', requirePermission('VIEW_PATIENT'), ctrl.list);

router.post('/',
    requirePermission('CREATE_PATIENT'),
    [body('name').notEmpty().trim(), body('gender').isIn(['M', 'F', 'O'])],
    validate,
    ctrl.create
);

router.get('/:id', requirePermission('VIEW_PATIENT'), ctrl.getById);

router.put('/:id', requirePermission('UPDATE_PATIENT'), ctrl.update);

router.get('/:id/timeline', requirePermission('VIEW_TIMELINE'), ctrl.getTimeline);

router.get('/:id/summary', requirePermission('VIEW_PATIENT'), ctrl.getSummary);

router.post('/:id/symptoms',
    requirePermission('UPDATE_PATIENT'),
    [body('symptoms').isArray({ min: 1 })],
    validate,
    ctrl.addSymptoms
);

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

router.get('/:id/admissions', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT * FROM admissions WHERE patient_id = $1 AND organization_id = $2 ORDER BY admitted_at DESC`,
            [req.params.id, req.orgId]
        );
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

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

router.get('/:id/proposed-plan', requirePermission('VIEW_PATIENT'), ctrl.getProposedPlan);

module.exports = router;
