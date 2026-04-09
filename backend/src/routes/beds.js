'use strict';

const { Router } = require('express');
const db = require('../config/db');

const router = Router();


router.get('/availability', async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT w.id AS ward_id, w.name AS ward_name, w.ward_type,
              COUNT(b.id)                                       AS total_beds,
              COUNT(b.id) FILTER (WHERE b.is_occupied = FALSE)  AS available_beds,
              COUNT(b.id) FILTER (WHERE b.is_occupied = TRUE)   AS occupied_beds
       FROM beds b
       JOIN wards w ON w.id = b.ward_id
       GROUP BY w.id, w.name, w.ward_type
       ORDER BY w.ward_type, w.name`
        );
        res.json({ data: result.rows });
    } catch (err) { next(err); }
});


router.get('/icu/availability', (_req, res, next) => {
    db.query(
        `SELECT COUNT(*) FILTER (WHERE is_icu = TRUE AND is_occupied = FALSE) AS available_icu_beds,
            COUNT(*) FILTER (WHERE is_icu = TRUE AND is_occupied = TRUE)  AS occupied_icu_beds,
            COUNT(*) FILTER (WHERE is_icu = TRUE)                         AS total_icu_beds
     FROM beds`
    )
        .then((r) => res.json({ data: r.rows[0] }))
        .catch(next);
});

module.exports = router;
