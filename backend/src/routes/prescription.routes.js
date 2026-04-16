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

router.get('/suggest', requirePermission('VIEW_PRESCRIPTIONS'), ctrl.suggest);

router.get('/:patientId', requirePermission('VIEW_PRESCRIPTIONS'), ctrl.listByPatient);

router.post('/check',
    requirePermission('CREATE_PRESCRIPTION'),
    [body('medicationIds').isArray({ min: 1 })],
    validate,
    ctrl.check
);

router.post('/',
    requirePermission('CREATE_PRESCRIPTION'),
    [body('admission_id').isInt(), body('medication_id').isInt(),
     body('dose').notEmpty(), body('frequency').notEmpty()],
    validate,
    ctrl.create
);

router.patch('/:id/cancel', requirePermission('CANCEL_PRESCRIPTION'), ctrl.cancel);

module.exports = router;
