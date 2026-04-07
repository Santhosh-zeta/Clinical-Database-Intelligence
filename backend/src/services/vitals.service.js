'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function record(body, orgId, recordedBy) {
    const { admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature, respiratory_rate, blood_glucose, notes } = body;

    // Verify admission belongs to this org
    const check = await db.query(
        `SELECT a.id, a.patient_id FROM admissions a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.id = $1 AND p.organization_id = $2 AND a.status = 'active'`,
        [admission_id, orgId]
    );
    if (!check.rowCount) throw createError('Active admission not found for this organization', 404);

    // Insert vitals — DB triggers fire: NEWS2 EWS + Trend Detection + ICU Escalation + Alerts
    const result = await db.query(
        `INSERT INTO vitals
            (admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
             respiratory_rate, blood_glucose, recorded_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
            respiratory_rate, blood_glucose, recordedBy, notes]
    );

    // Fetch the EWS that was just calculated by the DB trigger for the API response
    const ewsRes = await db.query(
        `SELECT total_score as score, category FROM ews_scores WHERE admission_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
        [admission_id]
    );

    // Check if a trend alert was triggered by the DB trigger
    const trendRes = await db.query(
        `SELECT message FROM alerts WHERE admission_id = $1 AND alert_type = 'TREND_ALERT' AND triggered_at > NOW() - INTERVAL '1 minute' LIMIT 1`,
        [admission_id]
    );

    return {
        vitals: result.rows[0],
        ews: ewsRes.rows[0] || { score: 0, category: 'low' },
        trend_alert: trendRes.rows[0] ? { triggered: true, message: trendRes.rows[0].message } : null
    };
}

async function history(patientId, orgId, { from, to, limit = 100 }) {
    const params = [patientId, orgId];
    let sql = `
        SELECT v.*
        FROM vitals v
        JOIN admissions a ON a.id = v.admission_id
        JOIN patients p   ON p.id = a.patient_id
        WHERE p.id = $1 AND p.organization_id = $2
    `;
    if (from) { params.push(from); sql += ` AND v.recorded_at >= $${params.length}`; }
    if (to) { params.push(to); sql += ` AND v.recorded_at <= $${params.length}`; }
    sql += ` ORDER BY v.recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await db.query(sql, params);
    return result.rows;
}

async function latest(patientId, orgId) {
    const result = await db.query(
        `SELECT v.* FROM vitals v
         JOIN admissions a ON a.id = v.admission_id
         WHERE a.patient_id = $1 AND a.status = 'active'
           AND a.organization_id = $2
         ORDER BY v.recorded_at DESC LIMIT 1`,
        [patientId, orgId]
    );
    if (!result.rowCount) throw createError('No vitals found', 404);
    return result.rows[0];
}

async function getEWS(admissionId, orgId) {
    const result = await db.query(
        `SELECT e.* FROM ews_scores e
         JOIN admissions a ON a.id = e.admission_id
         WHERE e.admission_id = $1 AND a.organization_id = $2
         ORDER BY e.calculated_at DESC LIMIT 1`,
        [admissionId, orgId]
    );
    return result.rows[0] || null;
}

module.exports = { record, history, latest, getEWS };
