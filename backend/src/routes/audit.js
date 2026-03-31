'use strict';

const { Router } = require('express');
const db = require('../config/db');

const router = Router();

// ── GET /api/audit-logs ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const { table_name, action, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let sql = 'SELECT al.*, d.name AS changed_by_name FROM audit_logs al LEFT JOIN doctors d ON d.id = al.changed_by WHERE 1=1';
        if (table_name) { params.push(table_name); sql += ` AND al.table_name = $${params.length}`; }
        if (action) { params.push(action); sql += ` AND al.action = $${params.length}`; }
        sql += ` ORDER BY al.changed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(sql, params);
        res.json({ data: result.rows, count: result.rowCount });
    } catch (err) { next(err); }
});

module.exports = router;
