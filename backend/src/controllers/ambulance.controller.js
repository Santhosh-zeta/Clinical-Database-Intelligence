'use strict';
const db = require('../config/db');

exports.getAll = async (req, res, next) => {
    try {
        const orgId = req.orgId;
        const result = await db.query(
            'SELECT * FROM ambulances WHERE org_id = $1 ORDER BY id',
            [orgId]
        );
        res.json({ data: result.rows });
    } catch (err) { next(err); }
};

exports.updatePosition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { lat, lng, speed, status, eta, dist, patient } = req.body;
        const orgId = req.orgId;

        const result = await db.query(
            `UPDATE ambulances
             SET lat = COALESCE($1, lat),
                 lng = COALESCE($2, lng),
                 speed = COALESCE($3, speed),
                 status = COALESCE($4, status),
                 eta = COALESCE($5, eta),
                 dist = COALESCE($6, dist),
                 patient = COALESCE($7, patient),
                 last_updated = NOW()
             WHERE id = $8 AND org_id = $9
             RETURNING *`,
            [lat, lng, speed, status, eta, dist, patient, id, orgId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Ambulance not found in this organization' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) { next(err); }
};
