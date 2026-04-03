'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/alerts.controller');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

/** GET   /api/alerts                         — list unacknowledged */
router.get('/', requirePermission('VIEW_ALERTS'), ctrl.list);

/** GET   /api/alerts/patient/:patientId       — alerts for a patient */
router.get('/patient/:patientId', requirePermission('VIEW_ALERTS'), ctrl.byPatient);

/** PATCH /api/alerts/:id/acknowledge          — acknowledge alert */
router.patch('/:id/acknowledge', requirePermission('ACKNOWLEDGE_ALERT'), ctrl.acknowledge);

/** POST  /api/alerts/escalate                 — manually trigger escalation */
router.post('/escalate', requirePermission('MANAGE_ICU'), ctrl.escalate);

/** POST  /api/alerts/deduplicate              — manually clean duplicate alerts */
router.post('/deduplicate', requirePermission('MANAGE_ICU'), ctrl.deduplicate);

module.exports = router;
