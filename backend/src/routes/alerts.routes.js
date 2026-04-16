'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/alerts.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/', requirePermission('VIEW_ALERTS'), ctrl.list);

router.get('/patient/:patientId', requirePermission('VIEW_ALERTS'), ctrl.byPatient);

router.patch('/:id/acknowledge', requirePermission('ACKNOWLEDGE_ALERT'), ctrl.acknowledge);

router.post('/escalate', requirePermission('MANAGE_ICU'), ctrl.escalate);

router.post('/deduplicate', requirePermission('MANAGE_ICU'), ctrl.deduplicate);

module.exports = router;
