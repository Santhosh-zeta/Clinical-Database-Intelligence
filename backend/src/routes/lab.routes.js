'use strict';

const Router = require('express').Router;
const svc = require('../services/lab.service');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/tests', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try { res.json({ data: await svc.listTests() }); } catch (e) { next(e); }
});

router.get('/admission/:id', requirePermission('VIEW_LAB_RESULTS'), async (req, res, next) => {
    try { res.json({ data: await svc.listByAdmission(req.params.id, req.orgId) }); } catch (e) { next(e); }
});

router.post('/order', requirePermission('ORDER_LAB_TEST'), async (req, res, next) => {
    try {
        const { admission_id, test_id, priority } = req.body;
        res.status(201).json({ data: await svc.createOrder(admission_id, req.orgId, req.user.id, test_id, priority) });
    } catch (e) { next(e); }
});

router.post('/orders/:id/verify', requirePermission('MANAGE_BILLING'), async (req, res, next) => {
    try {
        const { results } = req.body;
        res.json({ data: await svc.recordResults(req.params.id, req.orgId, req.user.id, results) });
    } catch (e) { next(e); }
});

module.exports = router;
