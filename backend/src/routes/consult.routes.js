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

/** GET /api/consults - list all consults */
router.get('/', requirePermission('VIEW_CONSULTS'), ctrl.list);

/** POST /api/consults - create new consult */
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

/** PUT /api/consults/:id/resolve - resolve/respond to consult */
router.put('/:id/resolve',
    requirePermission('RESOLVE_CONSULT'),
    [
        body('response').notEmpty().trim()
    ],
    validate,
    ctrl.resolve
);

module.exports = router;
