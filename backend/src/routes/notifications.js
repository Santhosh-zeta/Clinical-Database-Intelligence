'use strict';

const { Router } = require('express');
const db = require('../config/db');

const router = Router();

// ── GET /api/notifications ─────────────────────────────────────────────────
// Accepts ?doctor_id=N and optional ?unread_only=true
router.get('/', async (req, res, next) => {
    try {
        const { doctor_id, unread_only, page = 1, limit = 30 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let sql = `
      SELECT n.*, p.name AS patient_name
      FROM notifications n
      JOIN admissions a ON a.id = n.admission_id
      JOIN patients   p ON p.id = a.patient_id
      WHERE 1=1
    `;
        if (doctor_id) { params.push(doctor_id); sql += ` AND n.doctor_id = $${params.length}`; }
        if (unread_only === 'true') sql += ` AND n.is_read = FALSE`;
        sql += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(sql, params);
        res.json({ data: result.rows, count: result.rowCount });
    } catch (err) { next(err); }
});

// ── PUT /api/notifications/:id/read ───────────────────────────────────────
router.put('/:id/read', async (req, res, next) => {
    try {
        await db.query('UPDATE notifications SET is_read=TRUE WHERE id=$1', [req.params.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
});

module.exports = router;
