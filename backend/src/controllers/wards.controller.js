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

async function create(req, res, next) {
    try {
        const { name, ward_type, department_id } = req.body;
        const result = await db.query(
            'INSERT INTO wards (name, ward_type, department_id) VALUES ($1, $2, $3) RETURNING *',
            [name, ward_type, department_id]
        );
        res.status(201).json({ data: result.rows[0] });
    } catch (e) {
        next(e);
    }
}

module.exports = { list, create };
