'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function getDashboardStats(orgId) {
    const result = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM admissions WHERE organization_id=$1 AND status='active')       AS active_admissions,
            (SELECT COUNT(*) FROM admissions WHERE organization_id=$1 AND status='discharged'
              AND discharged_at >= NOW() - INTERVAL '24 hours')                                  AS discharged_today,
            (SELECT COUNT(*) FROM patients WHERE organization_id=$1)                             AS total_patients,
            (SELECT COUNT(*) FROM alerts WHERE organization_id=$1 AND is_acknowledged=FALSE)     AS unacknowledged_alerts,
            (SELECT COUNT(*) FROM alerts WHERE organization_id=$1 AND severity='critical'
              AND is_acknowledged=FALSE)                                                          AS critical_alerts,
            (SELECT COUNT(*) FROM beds b JOIN wards w ON w.id=b.ward_id
              WHERE b.organization_id=$1 AND b.is_icu=TRUE AND b.is_occupied=FALSE)              AS available_icu_beds,
            (SELECT COUNT(*) FROM beds WHERE organization_id=$1 AND is_icu=TRUE)                 AS total_icu_beds,
            (SELECT COUNT(*) FROM doctors WHERE organization_id=$1 AND is_active=TRUE)           AS active_doctors,
            (SELECT COUNT(*) FROM (
                SELECT DISTINCT ON(e.admission_id) e.category FROM ews_scores e
                JOIN admissions a ON a.id=e.admission_id
                WHERE a.organization_id=$1 AND a.status='active'
                ORDER BY e.admission_id, e.calculated_at DESC
            ) s WHERE category='urgent')                                                         AS urgent_ews_patients,
            (SELECT COUNT(*) FROM (
                SELECT DISTINCT ON(e.admission_id) e.category FROM ews_scores e
                JOIN admissions a ON a.id=e.admission_id
                WHERE a.organization_id=$1 AND a.status='active'
                ORDER BY e.admission_id, e.calculated_at DESC
            ) s WHERE category='high')                                                           AS high_ews_patients,
            (SELECT COUNT(*) FROM (
                SELECT DISTINCT ON(rs.admission_id) rs.category FROM risk_scores rs
                JOIN admissions a ON a.id=rs.admission_id
                WHERE a.organization_id=$1 AND a.status='active'
                ORDER BY rs.admission_id, rs.calculated_at DESC
            ) sub WHERE category='critical')                                                     AS critical_patients,
            (SELECT COUNT(*) FROM (
                SELECT DISTINCT ON(rs.admission_id) rs.category FROM risk_scores rs
                JOIN admissions a ON a.id=rs.admission_id
                WHERE a.organization_id=$1 AND a.status='active'
                ORDER BY rs.admission_id, rs.calculated_at DESC
            ) sub WHERE category='stable')                                                       AS stable_patients
         `,
        [orgId]
    );
    return result.rows[0];
}

async function getBedHeatmap(orgId) {
    const result = await db.query(
        `SELECT w.id AS ward_id, w.name AS ward_name, w.ward_type,
                COUNT(b.id) AS total_beds,
                COUNT(b.id) FILTER (WHERE b.is_occupied=FALSE) AS available_beds,
                COUNT(b.id) FILTER (WHERE b.is_occupied=TRUE)  AS occupied_beds,
                COUNT(b.id) FILTER (WHERE b.is_icu=TRUE)       AS icu_beds
         FROM beds b
         JOIN wards w ON w.id = b.ward_id
         WHERE b.organization_id = $1
         GROUP BY w.id, w.name, w.ward_type
         ORDER BY w.ward_type, w.name`,
        [orgId]
    );
    return result.rows;
}

async function getEWSSummary(orgId) {
    const result = await db.query(
        `SELECT ew.category, COUNT(*) AS patient_count
         FROM (
             SELECT DISTINCT ON(e.admission_id) e.category
             FROM ews_scores e
             JOIN admissions a ON a.id = e.admission_id
             WHERE a.organization_id = $1 AND a.status = 'active'
             ORDER BY e.admission_id, e.calculated_at DESC
         ) ew
         GROUP BY ew.category`,
        [orgId]
    );
    return result.rows;
}

async function getOrgSettings(orgId) {
    const result = await db.query(
        'SELECT * FROM organization_settings WHERE org_id = $1', [orgId]
    );
    if (!result.rowCount) throw createError('Organization settings not found', 404);
    return result.rows[0];
}

async function updateOrgSettings(orgId, settings) {
    const allowed = ['ews_high_threshold', 'ews_urgent_threshold', 'alert_cooldown_minutes', 'icu_auto_assign', 'escalation_wait_minutes'];
    const sets = [];
    const params = [orgId];
    for (const [k, v] of Object.entries(settings)) {
        if (allowed.includes(k)) { params.push(v); sets.push(`${k}=$${params.length}`); }
    }
    if (!sets.length) throw createError('No valid settings provided', 400);
    sets.push('updated_at=NOW()');
    const result = await db.query(
        `UPDATE organization_settings SET ${sets.join(',')} WHERE org_id=$1 RETURNING *`,
        params
    );
    return result.rows[0];
}


/** Critical patients (risk=critical OR ews=urgent) — for the priority incidents panel */
async function getCriticalPatients(orgId) {
    const result = await db.query(
        `SELECT DISTINCT ON (a.patient_id)
                p.id AS patient_id, p.name AS patient_name, p.blood_group,
                a.id AS admission_id, a.diagnosis, a.admitted_at,
                d.name AS doctor_name, w.name AS ward_name, b.bed_number, b.is_icu,
                rs.score AS risk_score, rs.category AS risk_category,
                ew.total_score AS ews, ew.category AS ews_category,
                (SELECT COUNT(*) FROM alerts al WHERE al.admission_id = a.id
                  AND al.is_acknowledged = FALSE AND al.severity IN ('critical','high')) AS active_critical_alerts
         FROM admissions a
         JOIN patients  p  ON p.id  = a.patient_id
         JOIN doctors   d  ON d.id  = a.doctor_id
         LEFT JOIN wards w ON w.id  = a.ward_id
         LEFT JOIN beds  b ON b.id  = a.bed_id
         LEFT JOIN LATERAL (
             SELECT score, category FROM risk_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         LEFT JOIN LATERAL (
             SELECT total_score, category FROM ews_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) ew ON TRUE
         WHERE a.organization_id = $1
           AND a.status = 'active'
           AND (rs.category IN ('critical','high') OR ew.category IN ('urgent','high'))
         ORDER BY a.patient_id, rs.score DESC NULLS LAST`,
        [orgId]
    );
    return result.rows;
}

/** Alert severity breakdown + escalation level distribution */
async function getAlertsSummary(orgId) {
    const bySeverity = await db.query(
        `SELECT severity, status, COUNT(*) AS count
         FROM alerts WHERE organization_id = $1
           AND triggered_at >= NOW() - INTERVAL '24 hours'
         GROUP BY severity, status
         ORDER BY severity`,
        [orgId]
    );

    const byEscalation = await db.query(
        `SELECT
             escalation_level,
             CASE escalation_level
                 WHEN 1 THEN 'nurse_level'
                 WHEN 2 THEN 'doctor_level'
                 WHEN 3 THEN 'icu_admin_level'
                 ELSE 'unknown'
             END AS level_label,
             COUNT(*) AS count
         FROM alerts
         WHERE organization_id = $1
           AND is_acknowledged = FALSE
           AND severity IN ('critical','high')
         GROUP BY escalation_level
         ORDER BY escalation_level`,
        [orgId]
    );

    const trendAlerts = await db.query(
        `SELECT COUNT(*) AS count FROM alerts
         WHERE organization_id = $1 AND alert_type = 'TREND_ALERT'
           AND triggered_at >= NOW() - INTERVAL '24 hours'`,
        [orgId]
    );

    return {
        by_severity: bySeverity.rows,
        by_escalation: byEscalation.rows,
        trend_alerts_24h: parseInt(trendAlerts.rows[0]?.count || 0),
        escalation_levels: {
            1: 'Nurse level — initial response',
            2: 'Doctor level — clinical intervention',
            3: 'ICU/Admin level — emergency override',
        },
    };
}

/** Real-time bed status across all wards */
async function getBedStatus(orgId) {
    const result = await db.query(
        `SELECT w.id AS ward_id, w.name AS ward_name, w.ward_type, w.department_id,
                dept.name AS department_name,
                b.id AS bed_id, b.bed_number, b.is_occupied, b.is_icu,
                CASE WHEN b.is_occupied THEN p.name ELSE NULL END AS patient_name,
                CASE WHEN b.is_occupied THEN a.id ELSE NULL END AS admission_id,
                CASE WHEN b.is_occupied THEN rs.score ELSE NULL END AS risk_score,
                CASE WHEN b.is_occupied THEN rs.category ELSE NULL END AS risk_category,
                CASE WHEN b.is_occupied THEN ew.category ELSE NULL END AS ews_category
         FROM beds b
         JOIN wards w ON w.id = b.ward_id
         LEFT JOIN departments dept ON dept.id = w.department_id
         LEFT JOIN admissions a ON a.bed_id = b.id AND a.status = 'active'
         LEFT JOIN patients   p ON p.id  = a.patient_id
         LEFT JOIN LATERAL (
             SELECT score, category FROM risk_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         LEFT JOIN LATERAL (
             SELECT category FROM ews_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) ew ON TRUE
         WHERE b.organization_id = $1
         ORDER BY w.ward_type, w.name, b.bed_number`,
        [orgId]
    );
    return result.rows;
}

/** Ward-level analytics: occupancy + avg risk score per ward */
async function getWardAnalytics(orgId) {
    const result = await db.query(
        `SELECT
            w.id AS ward_id, w.name AS ward_name, w.ward_type,
            COUNT(b.id) AS total_beds,
            COUNT(b.id) FILTER (WHERE b.is_occupied=TRUE) AS occupied_beds,
            COUNT(b.id) FILTER (WHERE b.is_occupied=FALSE) AS available_beds,
            COUNT(b.id) FILTER (WHERE b.is_icu=TRUE) AS icu_beds,
            ROUND(AVG(rs.score) FILTER (WHERE b.is_occupied=TRUE AND rs.score IS NOT NULL), 1) AS avg_risk_score,
            COUNT(a.id) FILTER (WHERE rs.category='critical') AS critical_count,
            COUNT(a.id) FILTER (WHERE al.id IS NOT NULL) AS alert_count
         FROM wards w
         LEFT JOIN beds b ON b.ward_id = w.id AND b.organization_id = $1
         LEFT JOIN admissions a ON a.bed_id = b.id AND a.status = 'active'
         LEFT JOIN LATERAL (
             SELECT score, category FROM risk_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         LEFT JOIN alerts al ON al.admission_id = a.id AND al.is_acknowledged = FALSE
         WHERE w.organization_id = $1
         GROUP BY w.id, w.name, w.ward_type
         ORDER BY w.ward_type, w.name`,
        [orgId]
    );
    return result.rows;
}

/** Discharge trend: daily discharge count for last 14 days */
async function getDischargeTrends(orgId) {
    const result = await db.query(
        `SELECT
            DATE(discharged_at) AS day,
            COUNT(*) AS discharged,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM discharged_at) BETWEEN 0 AND 11) AS morning,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM discharged_at) BETWEEN 12 AND 23) AS afternoon
         FROM admissions
         WHERE organization_id = $1
           AND status = 'discharged'
           AND discharged_at >= NOW() - INTERVAL '14 days'
         GROUP BY DATE(discharged_at)
         ORDER BY day`,
        [orgId]
    );
    return result.rows;
}

/** Staff performance: admissions per doctor in last 30 days */
async function getStaffPerformance(orgId) {
    const result = await db.query(
        `SELECT
            d.id, d.name, d.specialization, d.is_active,
            COUNT(a.id) AS total_admissions,
            COUNT(a.id) FILTER (WHERE a.status='active') AS active_patients,
            COUNT(a.id) FILTER (WHERE a.status='discharged' AND a.discharged_at >= NOW() - INTERVAL '30 days') AS discharged_30d,
            ROUND(AVG(rs.score) FILTER (WHERE a.status='active' AND rs.score IS NOT NULL), 1) AS avg_patient_risk
         FROM doctors d
         LEFT JOIN admissions a ON a.doctor_id = d.id AND a.organization_id = $1
         LEFT JOIN LATERAL (
             SELECT score FROM risk_scores WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         WHERE d.organization_id = $1 AND d.is_active = TRUE
         GROUP BY d.id, d.name, d.specialization, d.is_active
         ORDER BY active_patients DESC`,
        [orgId]
    );
    return result.rows;
}

module.exports = {
    getDashboardStats, getBedHeatmap, getEWSSummary,
    getOrgSettings, updateOrgSettings,
    getCriticalPatients, getAlertsSummary, getBedStatus,
    getWardAnalytics, getDischargeTrends, getStaffPerformance,
};

