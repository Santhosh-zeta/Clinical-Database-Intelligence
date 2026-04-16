'use strict';

const service = require('../services/consult.service');

async function list(req, res, next) {
    try {
        const data = await service.listAll(req.orgId);
        res.json({ data });
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        const { patient_id, specialty, priority, reason } = req.body;
        const consult = await service.create(req.orgId, req.user.id, {
            patient_id,
            specialty,
            priority,
            reason
        });
        res.status(201).json({ data: consult });
    } catch (e) {
        next(e);
    }
}

async function resolve(req, res, next) {
    try {
        const { id } = req.params;
        const { findings, recommendations, symptomIds = [], prescriptions = [] } = req.body;
        const consult = await service.resolve(req.orgId, req.user.id, id, {
            findings,
            recommendations,
            symptomIds,
            prescriptions
        });
        if (!consult) return res.status(404).json({ error: 'Consultation not found' });
        res.json({ data: consult });
    } catch (e) {
        next(e);
    }
}

async function finalize(req, res, next) {
    try {
        const { id } = req.params;
        const { findings, recommendations, symptomIds, prescriptions, labOrders } = req.body;
        const consult = await service.finalize(req.orgId, req.user.id, id, {
            findings,
            recommendations,
            symptomIds,
            prescriptions,
            labOrders
        });
        if (!consult) return res.status(404).json({ error: 'Consultation not found' });
        res.json({ data: consult });
    } catch (e) {
        next(e);
    }
}

module.exports = { list, create, resolve, finalize };
