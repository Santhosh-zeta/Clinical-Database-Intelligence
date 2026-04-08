'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const svc = require('../services/medication.service');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** GET /api/medications/pending - list pending medications for shift */
router.get('/pending', requirePermission('VIEW_PRESCRIPTIONS'), async (req, res, next) => {
    try {
        res.json({ data: await svc.listPending(req.orgId) });
    } catch (e) {
        next(e);
    }
});

/** POST /api/medications/administer - record administration */
router.post('/administer',
    requirePermission('ADMINISTER_MEDICATION'),
    [
        body('prescription_id').isInt(),
        body('status').isIn(['given', 'missed', 'refused', 'held'])
    ],
    validate,
    async (req, res, next) => {
        try {
            res.status(201).json({ data: await svc.administer(req.orgId, req.user.id, req.body) });
        } catch (e) {
            next(e);
        }
    }
);

module.exports = router;
