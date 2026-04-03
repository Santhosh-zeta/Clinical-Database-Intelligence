'use strict';

const svc = require('../services/admin.service');

const stats        = async (req, res, next) => { try { res.json({ data: await svc.getDashboardStats(req.orgId) }); } catch(e){next(e);} };
const bedHeatmap   = async (req, res, next) => { try { res.json({ data: await svc.getBedHeatmap(req.orgId) }); } catch(e){next(e);} };
const ewsSummary   = async (req, res, next) => { try { res.json({ data: await svc.getEWSSummary(req.orgId) }); } catch(e){next(e);} };

// New Smart Dashboard Endpoints
const getCriticalPatients = async (req, res, next) => { try { res.json({ data: await svc.getCriticalPatients(req.orgId) }); } catch(e) { next(e); } };
const getAlertsSummary    = async (req, res, next) => { try { res.json({ data: await svc.getAlertsSummary(req.orgId) }); } catch(e) { next(e); } };
const getBedStatus        = async (req, res, next) => { try { res.json({ data: await svc.getBedStatus(req.orgId) }); } catch(e) { next(e); } };

const getSettings  = async (req, res, next) => { try { res.json({ data: await svc.getOrgSettings(req.orgId) }); } catch(e){next(e);} };
const updateSettings = async (req, res, next) => {
    try { res.json({ data: await svc.updateOrgSettings(req.orgId, req.body), message: 'Settings updated' }); } catch(e){next(e);}
};

module.exports = {
    stats, bedHeatmap, ewsSummary,
    getCriticalPatients, getAlertsSummary, getBedStatus,
    getSettings, updateSettings
};
