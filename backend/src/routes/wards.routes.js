'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/wards.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/', requirePermission('VIEW_PATIENT'), ctrl.list);
router.post('/', requirePermission('MANAGE_BILLING'), ctrl.create);

module.exports = router;
