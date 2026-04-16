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

router.get('/', requirePermission('VIEW_ADMISSIONS'), ctrl.list);

router.get('/suggestions', requirePermission('DISCHARGE_PATIENT'), ctrl.listSuggestions);

router.post('/',
    requirePermission('CREATE_ADMISSION'),
    [body('patient_id').isInt(), body('doctor_id').isInt()],
    validate,
    ctrl.create
);

router.get('/:id', requirePermission('VIEW_ADMISSIONS'), ctrl.getById);

router.put('/:id/discharge', requirePermission('DISCHARGE_PATIENT'), ctrl.discharge);

router.get('/:id/discharge-ready', requirePermission('DISCHARGE_PATIENT'), ctrl.dischargeReady);

module.exports = router;
