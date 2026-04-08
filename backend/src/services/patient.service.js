'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

async function list(orgId, { search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [orgId];
    let sql = `SELECT * FROM patients WHERE organization_id = $1`;
    if (search) { params.push(`%${search}%`); sql += ` AND name ILIKE $${params.length}`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await db.query(sql, params);
    return { rows: result.rows, count: result.rowCount };
}

async function getById(id, orgId) {
    const result = await db.query(
        'SELECT * FROM patients WHERE id = $1 AND organization_id = $2',
        [id, orgId]
    );
    if (!result.rowCount) throw createError('Patient not found', 404);
    return result.rows[0];
}

async function create(body, orgId) {
    const { name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions } = body;
    const result = await db.query(
        `INSERT INTO patients (name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions, organization_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions, orgId]
    );
    return result.rows[0];
}

async function update(id, body, orgId) {
    const { name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions } = body;
    const result = await db.query(
        `UPDATE patients SET name=$1, date_of_birth=$2, gender=$3, blood_group=$4, contact=$5,
         emergency_contact=$6, address=$7, allergies=$8, chronic_conditions=$9, updated_at=NOW()
         WHERE id=$10 AND organization_id=$11 RETURNING *`,
        [name, date_of_birth, gender, blood_group, contact, emergency_contact, address, allergies, chronic_conditions, id, orgId]
    );
    if (!result.rowCount) throw createError('Patient not found', 404);
    return result.rows[0];
}

async function getTimeline(patientId, orgId, { page = 1, limit = 100 } = {}) {
    const offset = (page - 1) * limit;

    // Unified timeline from patient_events (populated by DB triggers + services)
    const eventsResult = await db.query(
        `SELECT pe.id, pe.event_type, pe.description, pe.metadata,
                pe.reference_id, pe.reference_table, pe.created_at,
                d.name AS created_by_name
         FROM patient_events pe
         LEFT JOIN doctors d ON d.id = pe.created_by
         WHERE pe.patient_id = $1 AND pe.organization_id = $2
         ORDER BY pe.created_at DESC
         LIMIT $3 OFFSET $4`,
        [patientId, orgId, limit, offset]
    );

    // Enrich events with live data from their source tables
    const events = await Promise.all(eventsResult.rows.map(async (ev) => {
        let detail = null;
        try {
            if (ev.event_type === 'admission' && ev.reference_id) {
                const r = await db.query(
                    `SELECT a.diagnosis, a.status, a.admitted_at, a.discharged_at,
                            d.name AS doctor_name, w.name AS ward_name, b.bed_number
                     FROM admissions a
                     JOIN doctors d ON d.id = a.doctor_id
                     LEFT JOIN wards w ON w.id = a.ward_id
                     LEFT JOIN beds b  ON b.id = a.bed_id
                     WHERE a.id = $1`, [ev.reference_id]
                );
                detail = r.rows[0] || null;
            } else if (ev.event_type === 'alert' && ev.reference_id) {
                const r = await db.query(
                    `SELECT severity, alert_type, message, status,
                            escalation_level, triggered_at, is_acknowledged
                     FROM alerts WHERE id = $1`, [ev.reference_id]
                );
                detail = r.rows[0] || null;
            } else if (ev.event_type === 'prescription' && ev.reference_id) {
                const r = await db.query(
                    `SELECT pr.dose, pr.frequency, pr.route, pr.status,
                            m.name AS medication_name, m.category,
                            d.name AS prescribed_by
                     FROM prescriptions pr
                     JOIN medications m ON m.id = pr.medication_id
                     JOIN doctors d     ON d.id = pr.prescribed_by
                     WHERE pr.id = $1`, [ev.reference_id]
                );
                detail = r.rows[0] || null;
            } else if (ev.event_type === 'ews_score') {
                // metadata already has ews + category from trigger
                detail = ev.metadata;
            } else if (ev.event_type === 'diagnosis' && ev.reference_id) {
                const r = await db.query(
                    `SELECT diagnosis_text, severity, type, icd10_code, d.name AS doctor_name
                     FROM diagnoses di LEFT JOIN doctors d ON d.id = di.doctor_id
                     WHERE di.id = $1`, [ev.reference_id]
                );
                detail = r.rows[0] || null;
            }
        } catch (_) { /* detail stays null if sub-query fails */ }
        return { ...ev, detail };
    }));

    // Parallel: get summary counts for the patient
    const [admCount, alertCount, presCount, ewsLatest] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM admissions WHERE patient_id=$1`, [patientId]),
        db.query(`SELECT COUNT(*) FROM alerts al JOIN admissions a ON a.id=al.admission_id WHERE a.patient_id=$1`, [patientId]),
        db.query(`SELECT COUNT(*) FROM prescriptions pr JOIN admissions a ON a.id=pr.admission_id WHERE a.patient_id=$1`, [patientId]),
        db.query(`SELECT total_score, category FROM ews_scores e JOIN admissions a ON a.id=e.admission_id WHERE a.patient_id=$1 AND a.status='active' ORDER BY e.calculated_at DESC LIMIT 1`, [patientId]),
    ]);

    return {
        timeline: events,
        total_events: eventsResult.rowCount,
        summary: {
            total_admissions: parseInt(admCount.rows[0]?.count || 0),
            total_alerts: parseInt(alertCount.rows[0]?.count || 0),
            total_prescriptions: parseInt(presCount.rows[0]?.count || 0),
            latest_ews: ewsLatest.rows[0] || null,
        },
    };
}

async function addSymptoms(patientId, admissionId, symptoms, notedBy) {
    const inserted = [];
    for (const s of symptoms) {
        const sym = await db.query('SELECT id FROM symptoms WHERE name ILIKE $1', [`%${s.name}%`]);
        const symptomId = sym.rows[0]?.id;
        if (!symptomId) continue;
        await db.query(
            `INSERT INTO patient_symptoms (patient_id, admission_id, symptom_id, severity, noted_by)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [patientId, admissionId, symptomId, s.severity || 'moderate', notedBy]
        );
        inserted.push(s.name);
    }
    return inserted;
}

async function createAppointment(patientId, orgId, userId, { doctor_id, appointment_at, reason, location }) {
    const result = await db.query(
        `INSERT INTO patient_appointments (patient_id, organization_id, doctor_id, appointment_at, reason, location)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [patientId, orgId, doctor_id || userId, appointment_at, reason, location || 'General Clinic']
    );
    return result.rows[0];
}

async function getPatientSummary(patientId, orgId) {
    const [patient, activeAdm, latestVitals, appts, unpaidInvoices] = await Promise.all([
        db.query('SELECT name, date_of_birth, gender, blood_group, chronic_conditions, allergies FROM patients WHERE id = $1 AND organization_id = $2', [patientId, orgId]),
        db.query(`
            SELECT a.*, w.name as ward_name, b.bed_number, d.name as doctor_name
            FROM admissions a
            LEFT JOIN wards w ON w.id = a.ward_id
            LEFT JOIN beds b ON b.id = a.bed_id
            LEFT JOIN doctors d ON d.id = a.doctor_id
            WHERE a.patient_id = $1 AND a.status = 'active'
            ORDER BY a.admitted_at DESC LIMIT 1
        `, [patientId]),
        db.query('SELECT * FROM vitals WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 1', [patientId]),
        db.query('SELECT COUNT(*) FROM patient_appointments WHERE patient_id = $1 AND appointment_at > NOW() AND status = \'scheduled\'', [patientId]),
        db.query('SELECT COUNT(*) FROM billing_invoices bi JOIN admissions a ON a.id = bi.admission_id WHERE a.patient_id = $1 AND bi.status != \'paid\'', [patientId])
    ]);

    // 5. Recent Activity Preview
    const activity = await db.query(
        `(SELECT 'lab' as type, test_name as name, result_value as value, recorded_at as date 
          FROM lab_results WHERE patient_id = $1 
          UNION ALL
          SELECT 'billing' as type, item_name as name, total_price::text as value, recorded_at as date
          FROM billing_items bi JOIN billing_invoices bv ON bi.invoice_id = bv.id WHERE bv.admission_id IN (SELECT id FROM admissions WHERE patient_id = $1))
         ORDER BY date DESC LIMIT 5`,
        [patientId]
    );

    // 6. Active Prescriptions Preview
    const meds = await db.query(
        `SELECT medication_name, dose, frequency FROM prescriptions 
         WHERE patient_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 3`,
        [patientId]
    );

    return {
        patient: patient.rows[0],
        active_admission: activeAdm.rows[0],
        latest_vitals: latestVitals.rows[0],
        upcoming_appointments: parseInt(appts.rows[0]?.count || 0),
        unpaid_invoices: parseInt(unpaidInvoices.rows[0]?.count || 0),
        recent_activity: activity.rows,
        active_prescriptions: meds.rows
    };
}

module.exports = { list, getById, create, update, getTimeline, addSymptoms, createAppointment, getPatientSummary };
