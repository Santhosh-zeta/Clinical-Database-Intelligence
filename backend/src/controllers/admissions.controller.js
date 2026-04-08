'use strict';

const svc = require('../services/admissions.service');

const list = async (req, res, next) => { try { res.json(await svc.list(req.orgId, req.query)); } catch (e) { next(e); } };
const getById = async (req, res, next) => { try { res.json({ data: await svc.getById(req.params.id, req.orgId) }); } catch (e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json({ data: await svc.create(req.body, req.orgId) }); } catch (e) { next(e); } };

const discharge = async (req, res, next) => {
    try {
        const data = await svc.discharge(req.params.id, req.orgId, req.body.discharge_notes);
        res.json({ data, message: 'Patient discharged successfully' });
    } catch (e) { next(e); }
};

const dischargeReady = async (req, res, next) => {
    try { res.json({ discharge_ready: await svc.isDischargeReady(req.params.id, req.orgId) }); } catch (e) { next(e); }
};

const listSuggestions = async (req, res, next) => {
    try { res.json({ data: await svc.getDischargableActive(req.orgId) }); } catch (e) { next(e); }
};

module.exports = { list, getById, create, discharge, dischargeReady, listSuggestions };

