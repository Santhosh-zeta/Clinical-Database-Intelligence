'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { calculateEWS } = require('../functions/clinical/calculateEWS');
const { detectTrend } = require('../functions/clinical/detectTrend');

async function record(body, orgId, recordedBy) {
    const { admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature, respiratory_rate, blood_glucose, notes } = body;

    // Verify admission belongs to this org
    const check = await db.query(
        `SELECT a.id, a.patient_id, a.doctor_id FROM admissions a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.id = $1 AND p.organization_id = $2 AND a.status = 'active'`,
        [admission_id, orgId]
    );
    if (!check.rowCount) throw createError('Active admission not found for this organization', 404);

    // Insert vitals — DB triggers fire: risk score + EWS + alerts + notifications
    const result = await db.query(
        `INSERT INTO vitals
            (admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
             respiratory_rate, blood_glucose, recorded_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [admission_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
            respiratory_rate, blood_glucose, recordedBy, notes]
    );

    // Pre-compute EWS for immediate API response
    const ews = calculateEWS({ heart_rate, systolic_bp, spo2, temperature, respiratory_rate });

    // ── TREND DETECTION: proactive deterioration alerting ─────────────────────
    const recentRows = await db.query(
        `SELECT heart_rate, systolic_bp, spo2, temperature, respiratory_rate
         FROM vitals WHERE admission_id = $1
         ORDER BY recorded_at DESC LIMIT 10`,
        [admission_id]
    );

    let trendAlert = null;
    if (recentRows.rowCount >= 3) {
        const trendResult = detectTrend([...recentRows.rows].reverse(), recentRows.rowCount);
        if (trendResult.deteriorating) {
            // Dedup: no TREND_ALERT for this admission in last 30 minutes
            const dupCheck = await db.query(
                `SELECT 1 FROM alerts
                 WHERE admission_id = $1 AND alert_type = 'TREND_ALERT'
                   AND triggered_at > NOW() - INTERVAL '30 minutes'
                   AND is_acknowledged = FALSE`,
                [admission_id]
            );
            if (!dupCheck.rowCount) {
                const msg = `Trend Alert: ${trendResult.alerts.join(' | ')}`;
                await db.query(
                    `INSERT INTO alerts
                        (admission_id, alert_type, severity, message, organization_id, status, response_deadline)
                     VALUES ($1, 'TREND_ALERT', 'high', $2, $3, 'active', NOW() + INTERVAL '15 minutes')`,
                    [admission_id, msg, orgId]
                );
                // Log to patient timeline
                await db.query(
                    `INSERT INTO patient_events
                        (patient_id, organization_id, event_type, reference_id, reference_table, description, metadata)
                     VALUES ($1, $2, 'alert', $3, 'admissions', $4, $5::jsonb)`,
                    [check.rows[0].patient_id, orgId, admission_id, msg,
                    JSON.stringify({ type: 'TREND_ALERT', deltas: trendResult.deltas })]
                );
                trendAlert = { triggered: true, message: msg, deltas: trendResult.deltas };
            }
        }
    }

    return { vitals: result.rows[0], ews, trend_alert: trendAlert };
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

async function trend(patientId, orgId, window = 10) {
    const rows = await history(patientId, orgId, { limit: window });
    const ascending = [...rows].reverse();
    return detectTrend(ascending, window);
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

module.exports = { record, history, latest, trend, getEWS };
