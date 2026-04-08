'use strict';

const Router = require('express').Router;
const svc = require('../services/billing.service');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/admission/:id', requirePermission('VIEW_BILLING'), async (req, res, next) => {
    try { res.json({ data: await svc.getInvoice(req.params.id, req.orgId) }); } catch (e) { next(e); }
});

router.post('/items', requirePermission('MANAGE_BILLING'), async (req, res, next) => {
    try {
        const { invoice_id, ...item } = req.body;
        res.status(201).json({ data: await svc.addItem(invoice_id, req.orgId, item) });
    } catch (e) { next(e); }
});

module.exports = router;
