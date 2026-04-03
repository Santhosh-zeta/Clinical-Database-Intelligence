'use strict';

const svc = require('../services/notification.service');

const list = async (req, res, next) => {
    try {
        const unreadOnly = req.query.unread_only === 'true';
        res.json(await svc.list(req.user.id, req.orgId, { unreadOnly, ...req.query }));
    } catch(e){next(e);}
};

const markRead    = async (req, res, next) => { try { await svc.markRead(req.params.id, req.user.id); res.json({ message: 'Marked as read' }); } catch(e){next(e);} };
const markAllRead = async (req, res, next) => { try { const n = await svc.markAllRead(req.user.id); res.json({ updated: n }); } catch(e){next(e);} };

module.exports = { list, markRead, markAllRead };
