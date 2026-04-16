'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/handover.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/ward/:wardId', requirePermission('VIEW_PATIENT'), ctrl.listByWard);
router.post('/', requirePermission('VIEW_PATIENT'), ctrl.create);

module.exports = router;
