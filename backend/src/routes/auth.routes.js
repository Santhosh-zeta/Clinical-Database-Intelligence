'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/auth.controller');

const router = Router();
const validate = (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
    next();
};

/** POST /api/auth/login */
router.post('/login',
    [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
    validate,
    ctrl.login
);

module.exports = router;
