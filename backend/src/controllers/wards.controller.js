'use strict';

const db = require('../config/db');

async function list(req, res, next) {
    try {
        const result = await db.query('SELECT * FROM wards ORDER BY name ASC');
        res.json({ data: result.rows });
    } catch (e) {
        next(e);
    }
}

module.exports = { list };
