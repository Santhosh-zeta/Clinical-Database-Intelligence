'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/prescription.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** GET  /api/prescriptions/suggest?diagnosis=hypertension — rule-based suggestions */
router.get('/suggest', requirePermission('VIEW_PRESCRIPTIONS'), ctrl.suggest);

/** GET  /api/prescriptions/:patientId — prescriptions for patient */
router.get('/:patientId', requirePermission('VIEW_PRESCRIPTIONS'), ctrl.listByPatient);

/** POST /api/prescriptions/check      — check drug interactions */
router.post('/check',
    requirePermission('CREATE_PRESCRIPTION'),
    [body('medicationIds').isArray({ min: 1 })],
    validate,
    ctrl.check
);

/** POST /api/prescriptions           — issue a prescription */
router.post('/',
    requirePermission('CREATE_PRESCRIPTION'),
    [body('admission_id').isInt(), body('medication_id').isInt(),
     body('dose').notEmpty(), body('frequency').notEmpty()],
    validate,
    ctrl.create
);

/** PATCH /api/prescriptions/:id/cancel — cancel */
router.patch('/:id/cancel', requirePermission('CANCEL_PRESCRIPTION'), ctrl.cancel);

module.exports = router;
