'use strict';

const svc = require('../services/alerts.service');

const list       = async (req, res, next) => { try { res.json(await svc.list(req.orgId, req.query)); } catch(e){next(e);} };
const byPatient  = async (req, res, next) => { try { res.json({ data: await svc.listByPatient(req.params.patientId, req.orgId) }); } catch(e){next(e);} };

const acknowledge = async (req, res, next) => {
    try {
        const data = await svc.acknowledge(req.params.id, req.user.id, req.orgId);
        res.json({ data, message: 'Alert acknowledged' });
    } catch(e){next(e);}
};

const escalate   = async (req, res, next) => {
    try { res.json({ escalated: await svc.runEscalation(), message: 'Escalation run complete' }); } catch(e){next(e);}
};

const deduplicate = async (req, res, next) => {
    try { res.json({ removed: await svc.deduplicateAlerts(), message: 'Deduplication complete' }); } catch(e){next(e);}
};

module.exports = { list, byPatient, acknowledge, escalate, deduplicate };
