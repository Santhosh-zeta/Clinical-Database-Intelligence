'use strict';

const svc = require('../services/doctor.service');

const list = async (req, res, next) => { try { res.json({ data: await svc.list(req.orgId, req.query) }); } catch (e) { next(e); } };
const getById = async (req, res, next) => { try { res.json({ data: await svc.getById(req.params.id, req.orgId) }); } catch (e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json({ data: await svc.create(req.body, req.orgId) }); } catch (e) { next(e); } };
const update = async (req, res, next) => { try { res.json({ data: await svc.update(req.params.id, req.body, req.orgId) }); } catch (e) { next(e); } };
const remove = async (req, res, next) => { try { res.json({ data: await svc.remove(req.params.id, req.orgId) }); } catch (e) { next(e); } };

module.exports = { list, getById, create, update, remove };

