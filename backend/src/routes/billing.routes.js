'use strict';

const Router = require('express').Router;
const svc = require('../services/billing.service');
const { requirePermission } = require('../middleware/rbac');
const db = require('../config/db');

const router = Router();

/** GET /api/billing/admission/:id  — get or auto-create invoice with itemized breakdown */
router.get('/admission/:id', requirePermission('VIEW_BILLING'), async (req, res, next) => {
    try { res.json({ data: await svc.getInvoice(req.params.id, req.orgId) }); } catch (e) { next(e); }
});

/** POST /api/billing/admission/:id/generate — automated charge aggregation */
router.post('/admission/:id/generate', requirePermission('MANAGE_BILLING'), async (req, res, next) => {
    try { res.json({ data: await svc.generateInvoice(req.params.id, req.orgId) }); } catch (e) { next(e); }
});

/** POST /api/billing/admission/:id/pay  — settle invoice (must come before generic /:id route) */
router.post('/admission/:id/pay', requirePermission('VIEW_BILLING'), async (req, res, next) => {
    try { res.json({ data: await svc.payInvoice(req.params.id, req.orgId) }); } catch (e) { next(e); }
});

/** POST /api/billing/items  — add a line item to an invoice */
router.post('/items', requirePermission('MANAGE_BILLING'), async (req, res, next) => {
    try {
        const { invoice_id, ...item } = req.body;
        res.status(201).json({ data: await svc.addItem(invoice_id, req.orgId, item) });
    } catch (e) { next(e); }
});

/** GET /api/billing/all  — list all invoices (admin) */
router.get('/all', requirePermission('MANAGE_BILLING'), async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT bi.*, a.patient_id,
                    p.name as patient_name, p.medical_record_number
             FROM billing_invoices bi
             JOIN admissions a ON a.id = bi.admission_id
             JOIN patients p ON p.id = a.patient_id
             WHERE bi.organization_id = $1
             ORDER BY bi.created_at DESC`,
            [req.orgId]
        );
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

module.exports = router;
