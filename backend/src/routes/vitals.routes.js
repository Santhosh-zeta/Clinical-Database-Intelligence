'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/vitals.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

router.post('/',
    requirePermission('RECORD_VITALS'),
    [body('admission_id').isInt(), body('heart_rate').optional().isInt()],
    validate,
    ctrl.record
);

router.get('/:patientId', requirePermission('VIEW_VITALS'), ctrl.history);

router.get('/:patientId/latest', requirePermission('VIEW_VITALS'), ctrl.latest);

router.get('/:patientId/trend', requirePermission('VIEW_VITALS'), ctrl.trend);

router.get('/ews/:admissionId', requirePermission('VIEW_VITALS'), ctrl.getEWS);

module.exports = router;
