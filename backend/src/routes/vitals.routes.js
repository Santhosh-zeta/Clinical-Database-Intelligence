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

/** POST /api/vitals                        — record vitals (fires DB trigger chain) */
router.post('/',
    requirePermission('RECORD_VITALS'),
    [body('admission_id').isInt(), body('heart_rate').optional().isInt()],
    validate,
    ctrl.record
);

/** GET  /api/vitals/:patientId             — vitals history */
router.get('/:patientId', requirePermission('VIEW_VITALS'), ctrl.history);

/** GET  /api/vitals/:patientId/latest      — most recent reading */
router.get('/:patientId/latest', requirePermission('VIEW_VITALS'), ctrl.latest);

/** GET  /api/vitals/:patientId/trend       — rate-of-change analysis */
router.get('/:patientId/trend', requirePermission('VIEW_VITALS'), ctrl.trend);

/** GET  /api/vitals/ews/:admissionId       — latest EWS score */
router.get('/ews/:admissionId', requirePermission('VIEW_VITALS'), ctrl.getEWS);

module.exports = router;
