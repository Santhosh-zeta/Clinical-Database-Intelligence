'use strict';

const svc = require('../services/patient.service');

const list = async (req, res, next) => { try { res.json(await svc.list(req.orgId, req.query)); } catch (e) { next(e); } };
const getById = async (req, res, next) => { try { res.json({ data: await svc.getById(req.params.id, req.orgId) }); } catch (e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json({ data: await svc.create(req.body, req.orgId) }); } catch (e) { next(e); } };
const update = async (req, res, next) => { try { res.json({ data: await svc.update(req.params.id, req.body, req.orgId) }); } catch (e) { next(e); } };

const getTimeline = async (req, res, next) => {
    try { res.json(await svc.getTimeline(req.params.id, req.orgId, req.query)); } catch (e) { next(e); }
};

const addSymptoms = async (req, res, next) => {
    try {
        const { admission_id, symptoms } = req.body;
        const added = await svc.addSymptoms(req.params.id, admission_id, symptoms, req.user.id);
        res.json({ added, count: added.length });
    } catch (e) { next(e); }
};

const createAppointment = async (req, res, next) => {
    try { res.status(201).json({ data: await svc.createAppointment(req.params.id, req.orgId, req.user.id, req.body) }); } catch (e) { next(e); }
};

const getSummary = async (req, res, next) => {
    try { res.json({ data: await svc.getPatientSummary(req.params.id, req.orgId) }); } catch (e) { next(e); }
};

module.exports = { list, getById, create, update, getTimeline, addSymptoms, createAppointment, getSummary };
