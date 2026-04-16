'use strict';
const { Router } = require('express');
const ctrl = require('../controllers/ambulance.controller');
const router = Router();

router.get('/', ctrl.getAll);
router.put('/:id/telemetry', ctrl.updatePosition);

module.exports = router;
