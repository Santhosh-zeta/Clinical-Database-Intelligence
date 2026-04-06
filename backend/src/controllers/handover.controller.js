'use strict';

const svc = require('../services/handover.service');

const listByWard = async (req, res, next) => {
    try {
        res.json({ data: await svc.listByWard(req.params.wardId, req.orgId) });
    } catch (e) { next(e); }
};

const create = async (req, res, next) => {
    try {
        res.status(201).json({ data: await svc.create(req.body, req.orgId, req.user.id) });
    } catch (e) { next(e); }
};

module.exports = { listByWard, create };
