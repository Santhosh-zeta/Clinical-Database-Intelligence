'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/notifications.controller');

const router = Router();

router.get('/', ctrl.list);

router.put('/:id/read', ctrl.markRead);

router.put('/read-all', ctrl.markAllRead);

router.post('/', ctrl.create);

module.exports = router;
