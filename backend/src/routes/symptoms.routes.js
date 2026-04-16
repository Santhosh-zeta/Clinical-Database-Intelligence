'use strict';

const { Router } = require('express');
const db = require('../config/db');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.get('/', requirePermission('VIEW_PATIENT'), async (req, res, next) => {
    try {
        const result = await db.query(`SELECT id, name, category FROM symptoms ORDER BY category, name ASC`);
        res.json({ data: result.rows });
    } catch (e) { next(e); }
});

module.exports = router;
