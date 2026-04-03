'use strict';

const svc = require('../services/prescription.service');

const suggest = async (req, res, next) => {
    try {
        const { diagnosis } = req.query;
        if (!diagnosis) return res.status(400).json({ error: 'diagnosis query param required' });
        res.json({ data: await svc.getSuggestions(diagnosis), message: 'Rule-based suggestion from disease_medication_map' });
    } catch(e){next(e);}
};

const create = async (req, res, next) => {
    try {
        const result = await svc.create(req.body, req.orgId, req.user.id);
        res.status(201).json({
            data: result.prescription,
            interactions: result.interactions,
            interaction_warning: result.interactions.length > 0,
        });
    } catch(e){next(e);}
};

const check = async (req, res, next) => {
    try {
        const { medicationIds } = req.body;
        const interactions = medicationIds.length > 1 ? await svc.checkInteractions(medicationIds) : [];
        res.json({
            interactions,
            interaction_warning: interactions.length > 0,
        });
    } catch(e){next(e);}
};

const listByPatient = async (req, res, next) => {
    try { res.json({ data: await svc.listByPatient(req.params.patientId, req.orgId) }); } catch(e){next(e);}
};

const cancel = async (req, res, next) => {
    try { res.json({ data: await svc.cancel(req.params.id, req.orgId), message: 'Prescription cancelled' }); } catch(e){next(e);}
};

module.exports = { suggest, create, check, listByPatient, cancel };
