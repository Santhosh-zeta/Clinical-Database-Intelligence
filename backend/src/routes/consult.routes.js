'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/consult.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

router.get('/', requirePermission('VIEW_CONSULTS'), ctrl.list);

router.post('/',
    requirePermission('CREATE_CONSULT'),
    [
        body('patient_id').isInt(),
        body('specialty').notEmpty().trim(),
        body('priority').isIn(['routine', 'urgent', 'stat']),
        body('reason').notEmpty().trim()
    ],
    validate,
    ctrl.create
);

router.post('/:id/resolve',
    requirePermission('RESOLVE_CONSULT'),
    [
        body('findings').notEmpty().trim(),
        body('recommendations').notEmpty().trim()
    ],
    validate,
    ctrl.resolve
);

router.post('/:id/finalize',
    requirePermission('MANAGE_CONSULTS'),
    [
        body('findings').notEmpty().trim(),
        body('recommendations').notEmpty().trim()
    ],
    validate,
    ctrl.finalize
);

module.exports = router;
