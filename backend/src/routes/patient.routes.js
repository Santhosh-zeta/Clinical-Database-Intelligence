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
    [body('name').notEmpty().trim(), body('gender').isIn(['M','F','O'])],
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

module.exports = router;
