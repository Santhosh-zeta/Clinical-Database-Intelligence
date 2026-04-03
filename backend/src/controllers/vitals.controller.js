'use strict';

const svc = require('../services/vitals.service');

const record  = async (req, res, next) => {
    try {
        const result = await svc.record(req.body, req.orgId, req.user.id);
        res.status(201).json({ data: result.vitals, ews: result.ews, message: 'Vitals recorded. DB trigger chain fired.' });
    } catch(e){next(e);}
};

const history = async (req, res, next) => {
    try { res.json({ data: await svc.history(req.params.patientId, req.orgId, req.query) }); } catch(e){next(e);}
};

const latest  = async (req, res, next) => {
    try { res.json({ data: await svc.latest(req.params.patientId, req.orgId) }); } catch(e){next(e);}
};

const trend   = async (req, res, next) => {
    try { res.json({ data: await svc.trend(req.params.patientId, req.orgId, parseInt(req.query.window || '10')) }); } catch(e){next(e);}
};

const getEWS  = async (req, res, next) => {
    try { res.json({ data: await svc.getEWS(req.params.admissionId, req.orgId) }); } catch(e){next(e);}
};

module.exports = { record, history, latest, trend, getEWS };
