'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/notifications.controller');

const router = Router();

/** GET  /api/notifications            — inbox (own notifications) */
router.get('/', ctrl.list);

/** PUT  /api/notifications/:id/read   — mark one as read */
router.put('/:id/read', ctrl.markRead);

/** PUT  /api/notifications/read-all   — mark all as read */
router.put('/read-all', ctrl.markAllRead);

module.exports = router;
