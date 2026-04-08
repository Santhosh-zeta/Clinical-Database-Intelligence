'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function list(orgId, { status = 'active', ward_id, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let query = `SELECT a.id, a.patient_id, a.admitted_at, a.status, a.diagnosis,
                 p.name AS patient_name, p.gender, p.date_of_birth,
                 d.name AS doctor_name, w.name AS ward_name, b.bed_number,
                 rs.score AS risk_score, rs.category AS risk_category,
                 ew.total_score AS ews, ew.category AS ews_category
          FROM admissions a
          JOIN patients p ON p.id = a.patient_id
          JOIN doctors  d ON d.id = a.doctor_id
          LEFT JOIN wards w ON w.id = a.ward_id
          LEFT JOIN beds  b ON b.id = a.bed_id
          LEFT JOIN LATERAL (
              SELECT score, category FROM risk_scores
              WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
          ) rs ON TRUE
          LEFT JOIN LATERAL (
              SELECT total_score, category FROM ews_scores
              WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
          ) ew ON TRUE
          WHERE a.organization_id = $1 AND a.status = $2`;

    const params = [orgId, status];
    if (ward_id) {
        query += ` AND a.ward_id = $3`;
        params.push(ward_id);
    }

    query += ` ORDER BY a.admitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return { rows: result.rows, count: result.rowCount };
}

async function getById(id, orgId) {
    const result = await db.query(
        `SELECT a.*, p.name AS patient_name, p.date_of_birth, p.blood_group, p.allergies,
                d.name AS doctor_name, w.name AS ward_name, w.ward_type, b.bed_number,
                rs.score AS latest_risk_score, rs.category AS risk_category,
                ew.total_score AS ews, ew.category AS ews_category
         FROM admissions a
         JOIN patients p ON p.id = a.patient_id
         JOIN doctors  d ON d.id = a.doctor_id
         LEFT JOIN wards w ON w.id = a.ward_id
         LEFT JOIN beds  b ON b.id = a.bed_id
         LEFT JOIN LATERAL (
             SELECT score, category FROM risk_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         LEFT JOIN LATERAL (
             SELECT total_score, category FROM ews_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) ew ON TRUE
         WHERE a.id = $1 AND a.organization_id = $2`,
        [id, orgId]
    );
    if (!result.rowCount) throw createError('Admission not found', 404);
    return result.rows[0];
}

async function create(body, orgId) {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const { patient_id, doctor_id, ward_id, bed_id, diagnosis, notes } = body;

        // Verify patient belongs to org
        const patCheck = await client.query(
            'SELECT id FROM patients WHERE id=$1 AND organization_id=$2', [patient_id, orgId]
        );
        if (!patCheck.rowCount) throw createError('Patient not found in this organization', 404);

        // Prevent duplicate active admission
        const dupCheck = await client.query(
            `SELECT id FROM admissions WHERE patient_id=$1 AND status='active'`, [patient_id]
        );
        if (dupCheck.rowCount) throw createError('Patient already has an active admission', 409);

        // Bed availability check
        if (bed_id) {
            const bedCheck = await client.query('SELECT is_occupied FROM beds WHERE id=$1', [bed_id]);
            if (bedCheck.rows[0]?.is_occupied) throw createError('Bed is already occupied', 409);
        }

        const result = await client.query(
            `INSERT INTO admissions (patient_id, doctor_id, ward_id, bed_id, diagnosis, notes, organization_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [patient_id, doctor_id, ward_id, bed_id, diagnosis, notes, orgId]
        );
        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function discharge(id, orgId, dischargeNotes) {
    const note = dischargeNotes ? `\nDischarge notes: ${dischargeNotes}` : '';
    const result = await db.query(
        `UPDATE admissions SET status='discharged', discharged_at=NOW(), updated_at=NOW(),
         notes = COALESCE(notes,'') || $1
         WHERE id=$2 AND organization_id=$3 AND status='active' RETURNING *`,
        [note, id, orgId]
    );
    if (!result.rowCount) throw createError('Active admission not found', 404);
    return result.rows[0];
}

async function isDischargeReady(id, orgId) {
    const result = await db.query('SELECT suggest_discharge($1) AS discharge_ready', [id]);
    return result.rows[0].discharge_ready;
}

async function getDischargableActive(orgId) {
    const result = await db.query(
        `SELECT a.id, a.patient_id, p.name AS patient_name, a.diagnosis,
                d.name AS doctor_name, w.name AS ward_name, b.bed_number,
                rs.score AS risk_score, rs.category AS risk_category,
                ew.total_score AS ews, ew.category AS ews_category
         FROM admissions a
         JOIN patients p ON p.id = a.patient_id
         JOIN doctors  d ON d.id = a.doctor_id
         LEFT JOIN wards w ON w.id = a.ward_id
         LEFT JOIN beds  b ON b.id = a.bed_id
         LEFT JOIN LATERAL (
             SELECT score, category FROM risk_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) rs ON TRUE
         LEFT JOIN LATERAL (
             SELECT total_score, category FROM ews_scores
             WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
         ) ew ON TRUE
         WHERE a.organization_id = $1 AND a.status = 'active'
           AND suggest_discharge(a.id) = TRUE
         ORDER BY rs.score ASC`,
        [orgId]
    );
    return result.rows;
}

module.exports = { list, getById, create, discharge, isDischargeReady, getDischargableActive };
