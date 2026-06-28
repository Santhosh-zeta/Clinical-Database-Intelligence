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

    const query = `
        SELECT pe.id, pe.event_type, pe.description, pe.metadata,
               pe.reference_id, pe.reference_table, pe.created_at,
               d.name AS created_by_name,
               jsonb_build_object(
                 'admission', adm_detail,
                 'alert', alert_detail,
                 'prescription', rx_detail,
                 'diagnosis', diag_detail
               ) as details
        FROM patient_events pe
        LEFT JOIN doctors d ON d.id = pe.created_by
        LEFT JOIN LATERAL (
            SELECT jsonb_build_object(
                'diagnosis', a.diagnosis, 'status', a.status,
                'admitted_at', a.admitted_at, 'discharged_at', a.discharged_at,
                'doctor_name', d2.name, 'ward_name', w.name, 'bed_number', b.bed_number
            ) as adm_detail
            FROM admissions a
            JOIN doctors d2 ON d2.id = a.doctor_id
            LEFT JOIN wards w ON w.id = a.ward_id
            LEFT JOIN beds b  ON b.id = a.bed_id
            WHERE a.id = pe.reference_id AND pe.event_type = 'admission'
        ) adm ON TRUE
        LEFT JOIN LATERAL (
            SELECT jsonb_build_object(
                'severity', al.severity, 'alert_type', al.alert_type,
                'message', al.message, 'status', al.status,
                'escalation_level', al.escalation_level, 'triggered_at', al.triggered_at,
                'is_acknowledged', al.is_acknowledged
            ) as alert_detail
            FROM alerts al WHERE al.id = pe.reference_id AND pe.event_type = 'alert'
        ) alt ON TRUE
        LEFT JOIN LATERAL (
            SELECT jsonb_build_object(
                'dose', pr.dose, 'frequency', pr.frequency, 'route', pr.route, 'status', pr.status,
                'medication_name', m.name, 'category', m.category,
                'prescribed_by', d3.name
            ) as rx_detail
            FROM prescriptions pr
            JOIN medications m ON m.id = pr.medication_id
            JOIN doctors d3     ON d3.id = pr.prescribed_by
            WHERE pr.id = pe.reference_id AND pe.event_type = 'prescription'
        ) rx ON TRUE
        LEFT JOIN LATERAL (
            SELECT jsonb_build_object(
                'diagnosis_text', di.diagnosis_text, 'severity', di.severity,
                'type', di.type, 'icd10_code', di.icd10_code, 'doctor_name', d4.name
            ) as diag_detail
            FROM diagnoses di LEFT JOIN doctors d4 ON d4.id = di.doctor_id
            WHERE di.id = pe.reference_id AND pe.event_type = 'diagnosis'
        ) diag ON TRUE
        WHERE pe.patient_id = $1 AND pe.organization_id = $2
        ORDER BY pe.created_at DESC
        LIMIT $3 OFFSET $4
    `;

    const eventsResult = await db.query(query, [patientId, orgId, limit, offset]);

    const events = eventsResult.rows.map(ev => {
        let detail = null;
        if (ev.event_type === 'ews_score') detail = ev.metadata;
        else if (ev.event_type === 'admission') detail = ev.details.admission;
        else if (ev.event_type === 'alert') detail = ev.details.alert;
        else if (ev.event_type === 'prescription') detail = ev.details.prescription;
        else if (ev.event_type === 'diagnosis') detail = ev.details.diagnosis;

        const { details, ...rest } = ev;
        return { ...rest, detail };
    });

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

    const activity = await db.query(
        `(SELECT 'lab' as type, test_name as name, result_value as value, recorded_at as date
          FROM lab_results WHERE patient_id = $1
          UNION ALL
          SELECT 'billing' as type, item_name as name, total_price::text as value, recorded_at as date
          FROM billing_items bi JOIN billing_invoices bv ON bi.invoice_id = bv.id WHERE bv.admission_id IN (SELECT id FROM admissions WHERE patient_id = $1))
         ORDER BY date DESC LIMIT 5`,
        [patientId]
    );

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

async function getPatientProfile(admissionId, orgId) {
    const [admRes, countsRes, latestVitals, trendRes, dischargeReady] = await Promise.all([
        db.query(`
            SELECT a.*, p.name AS patient_name, p.date_of_birth, p.gender, p.blood_group, p.allergies,
                   d.name AS doctor_name, w.name AS ward_name, b.bed_number,
                   ew.total_score AS ews, ew.category AS ews_category
            FROM admissions a
            JOIN patients p ON p.id = a.patient_id
            JOIN doctors  d ON d.id = a.doctor_id
            LEFT JOIN wards w ON w.id = a.ward_id
            LEFT JOIN beds  b ON b.id = a.bed_id
            LEFT JOIN LATERAL (
                SELECT total_score, category FROM ews_scores
                WHERE admission_id = a.id ORDER BY calculated_at DESC LIMIT 1
            ) ew ON TRUE
            WHERE a.id = $1 AND a.organization_id = $2
        `, [admissionId, orgId]),

        db.query(`
            SELECT
                (SELECT COUNT(*) FROM admissions WHERE patient_id = (SELECT patient_id FROM admissions WHERE id = $1)) as total_admissions,
                (SELECT COUNT(*) FROM alerts WHERE admission_id = $1) as active_alerts,
                (SELECT COUNT(*) FROM patient_appointments WHERE patient_id = (SELECT patient_id FROM admissions WHERE id = $1) AND appointment_at > NOW()) as upcoming_appts
        `, [admissionId]),

        db.query(`
            SELECT * FROM vitals WHERE admission_id = $1 ORDER BY recorded_at DESC LIMIT 1
        `, [admissionId]),

        db.query(`
            SELECT v.* FROM vitals v WHERE v.admission_id = $1 ORDER BY v.recorded_at DESC LIMIT 10
        `, [admissionId]),

        db.query('SELECT suggest_discharge($1) AS discharge_ready', [admissionId])
    ]);

    const admission = admRes.rows[0];
    if (!admission) throw createError('Admission not found', 404);

    const vitalsSvc = require('./vitals.service');
    const trend = trendRes.rows.length >= 3 ? vitalsSvc.detectTrend([...trendRes.rows].reverse(), trendRes.rows.length) : null;

    return {
        admission,
        counts: {
            total_admissions: parseInt(countsRes.rows[0]?.total_admissions || 0),
            active_alerts: parseInt(countsRes.rows[0]?.active_alerts || 0),
            upcoming_appts: parseInt(countsRes.rows[0]?.upcoming_appts || 0)
        },
        latest_vitals: latestVitals.rows[0] || null,
        trend,
        discharge_ready: dischargeReady.rows[0]?.discharge_ready === true
    };
}

async function getProposedCarePlan(patientId, orgId) {
    const result = await db.query(
        `SELECT 
            c.id, 
            c.specialty, 
            c.findings, 
            c.proposed_plan, 
            d.name as doctor_name
         FROM clinical_consults c
         LEFT JOIN doctors d ON d.id = c.responding_dr_id
         WHERE c.patient_id = $1 AND c.organization_id = $2 AND c.status = 'under_review'
         ORDER BY c.updated_at DESC`,
        [patientId, orgId]
    );
    return result.rows;
}

module.exports = {
    list,
    getById,
    create,
    update,
    getTimeline,
    addSymptoms,
    createAppointment,
    getPatientSummary,
    getProposedCarePlan,
    getPatientProfile
};
