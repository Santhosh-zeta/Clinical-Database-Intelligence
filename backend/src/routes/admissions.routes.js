'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/admissions.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** GET  /api/admissions              — list (status filter) */
router.get('/', requirePermission('VIEW_ADMISSIONS'), ctrl.list);

/** POST /api/admissions              — admit patient */
router.post('/',
    requirePermission('CREATE_ADMISSION'),
    [body('patient_id').isInt(), body('doctor_id').isInt()],
    validate,
    ctrl.create
);

/** GET  /api/admissions/:id          — get with risk + EWS */
router.get('/:id', requirePermission('VIEW_ADMISSIONS'), ctrl.getById);

/** PUT  /api/admissions/:id/discharge — discharge */
router.put('/:id/discharge', requirePermission('DISCHARGE_PATIENT'), ctrl.discharge);

/** GET  /api/admissions/:id/discharge-ready — suggest discharge */
router.get('/:id/discharge-ready', requirePermission('DISCHARGE_PATIENT'), ctrl.dischargeReady);

module.exports = router;
