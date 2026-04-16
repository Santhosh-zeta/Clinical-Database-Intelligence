'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const dcCtrl = require('../controllers/doctors.controller');
const { requirePermission } = require('../middleware/rbac');
const adminSvc = require('../services/admin.service');
const db = require('../config/db');

const router = Router();

router.get('/dashboard', requirePermission('VIEW_DASHBOARD'), ctrl.stats);

router.get('/bed-heatmap', requirePermission('VIEW_DASHBOARD'), ctrl.bedHeatmap);

router.get('/ews-summary', requirePermission('VIEW_DASHBOARD'), ctrl.ewsSummary);

router.get('/critical-patients', requirePermission('VIEW_DASHBOARD'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getCriticalPatients(req.orgId) }); } catch (e) { next(e); }
});

router.get('/alerts-summary', requirePermission('VIEW_DASHBOARD'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getAlertsSummary(req.orgId) }); } catch (e) { next(e); }
});

router.get('/bed-status', requirePermission('VIEW_ICU'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getBedStatus(req.orgId) }); } catch (e) { next(e); }
});

router.get('/settings', requirePermission('MANAGE_SETTINGS'), ctrl.getSettings);

router.patch('/settings', requirePermission('MANAGE_SETTINGS'), ctrl.updateSettings);

router.get('/staff', requirePermission('MANAGE_STAFF'), dcCtrl.list);
router.post('/staff', requirePermission('MANAGE_STAFF'), dcCtrl.create);
router.patch('/staff/:id', requirePermission('MANAGE_STAFF'), dcCtrl.update);
router.delete('/staff/:id', requirePermission('MANAGE_STAFF'), dcCtrl.remove);


router.get('/audit-logs', requirePermission('VIEW_AUDIT_LOGS'), async (req, res, next) => {
    try {
        const { table_name, action, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const params = [req.orgId];
        let sql = `SELECT al.*, d.name AS changed_by_name FROM audit_logs al
                   LEFT JOIN doctors d ON d.id = al.changed_by
                   WHERE al.organization_id = $1`;
        if (table_name) { params.push(table_name); sql += ` AND al.table_name=$${params.length}`; }
        if (action) { params.push(action); sql += ` AND al.action=$${params.length}`; }
        sql += ` ORDER BY al.changed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await db.query(sql, params);
        res.json({ data: result.rows, count: result.rowCount });
    } catch (e) { next(e); }
});

router.get('/ward-analytics', requirePermission('VIEW_DASHBOARD'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getWardAnalytics(req.orgId) }); } catch (e) { next(e); }
});

router.get('/discharge-trends', requirePermission('VIEW_DASHBOARD'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getDischargeTrends(req.orgId) }); } catch (e) { next(e); }
});

router.get('/staff-performance', requirePermission('MANAGE_STAFF'), async (req, res, next) => {
    try { res.json({ data: await adminSvc.getStaffPerformance(req.orgId) }); } catch (e) { next(e); }
});

const admissionSvc = require('../services/admissions.service');
const medSvc = require('../services/medication.service');

router.get('/discharge-board', requirePermission('DISCHARGE_PATIENT'), async (req, res, next) => {
    try { res.json({ data: await admissionSvc.getDischargableActive(req.orgId) }); } catch (e) { next(e); }
});

router.get('/nurse/med-rounds', requirePermission('VIEW_PATIENTS'), async (req, res, next) => {
    try { res.json({ data: await medSvc.listPending(req.orgId) }); } catch (e) { next(e); }
});

const consultSvc = require('../services/consult.service');
router.get('/doctor/consults', requirePermission('VIEW_PATIENTS'), async (req, res, next) => {
    try { res.json({ data: await consultSvc.listAll(req.orgId) }); } catch (e) { next(e); }
});

router.post('/doctor/consults', requirePermission('UPDATE_PATIENT'), async (req, res, next) => {
    try { res.json({ data: await consultSvc.create(req.orgId, req.user.id, req.body) }); } catch (e) { next(e); }
});

router.post('/doctor/consults/:id/resolve', requirePermission('VIEW_PATIENTS'), async (req, res, next) => {
    try { res.json({ data: await consultSvc.resolve(req.orgId, req.user.id, req.params.id, req.body.response) }); } catch (e) { next(e); }
});

router.post('/nurse/administer', requirePermission('PRESCRIBE_MEDICATION'), async (req, res, next) => {
    try { res.json({ data: await medSvc.administer(req.orgId, req.user.id, req.body) }); } catch (e) { next(e); }
});

module.exports = router;
