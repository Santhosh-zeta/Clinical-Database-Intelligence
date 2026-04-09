'use strict';

const db = require('../config/db');

async function listAll(orgId) {
    const result = await db.query(
        `SELECT 
            c.*, 
            p.name as patient_name, 
            p.medical_record_number,
            d.name as requesting_dr_name,
            rd.name as responding_dr_name
         FROM clinical_consults c
         JOIN patients p ON p.id = c.patient_id
         JOIN doctors d ON d.id = c.requesting_dr_id
         LEFT JOIN doctors rd ON rd.id = c.responding_dr_id
         WHERE c.organization_id = $1
         ORDER BY c.created_at DESC`,
        [orgId]
    );
    return result.rows;
}

async function create(orgId, userId, { patient_id, specialty, priority, reason }) {
    const result = await db.query(
        `INSERT INTO clinical_consults (organization_id, requesting_dr_id, patient_id, specialty, priority, reason)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [orgId, userId, patient_id, specialty, priority || 'routine', reason]
    );
    const consult = result.rows[0];


    await db.query(
        `INSERT INTO patient_events (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
         VALUES ($1, $2, 'consult', $3, 'clinical_consults', $4, $5)`,
        [patient_id, orgId, consult.id, `Consultation requested: ${specialty} — ${reason}`, userId]
    ).catch(() => { });

    return consult;
}

async function resolve(orgId, userId, id, { findings, recommendations, symptomIds = [], prescriptions = [] }) {

    const result = await db.query(
        `UPDATE clinical_consults 
         SET status = 'completed', responding_dr_id = $1, findings = $2, recommendations = $3, completed_at = NOW()
         WHERE id = $4 AND organization_id = $5 RETURNING *`,
        [userId, findings, recommendations, id, orgId]
    );
    const consult = result.rows[0];
    if (!consult) return null;

    const { patient_id } = consult;


    const admissionRes = await db.query(
        `SELECT id FROM admissions WHERE patient_id = $1 AND organization_id = $2 AND status = 'active' ORDER BY admitted_at DESC LIMIT 1`,
        [patient_id, orgId]
    );
    const admission_id = admissionRes.rows[0]?.id || null;

    // Store symptoms
    if (symptomIds.length > 0 && admission_id) {
        for (const symId of symptomIds) {
            await db.query(
                `INSERT INTO patient_symptoms (patient_id, admission_id, symptom_id, noted_by)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (admission_id, symptom_id) DO NOTHING`,
                [patient_id, admission_id, symId, userId]
            ).catch(() => { });

            await db.query(
                `INSERT INTO patient_events (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
                 VALUES ($1, $2, 'symptom', $3, 'patient_symptoms', $4, $5)`,
                [patient_id, orgId, symId, `Symptom recorded during consultation`, userId]
            ).catch(() => { });
        }
    }

    // Store prescriptions
    if (prescriptions.length > 0 && admission_id) {
        for (const rx of prescriptions) {
            const rxRes = await db.query(
                `INSERT INTO prescriptions (admission_id, organization_id, prescribed_by, medication_id, dose, frequency, route, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [
                    admission_id, orgId, userId,
                    rx.medication_id, rx.dose, rx.frequency,
                    rx.route || 'oral',
                    rx.notes || null
                ]
            ).catch(() => ({ rows: [] }));

            const rxId = rxRes.rows[0]?.id;
            if (rxId) {
                await db.query(
                    `INSERT INTO patient_events (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
                     VALUES ($1, $2, 'prescription', $3, 'prescriptions', $4, $5)`,
                    [patient_id, orgId, rxId, `Prescription issued during consultation resolution`, userId]
                ).catch(() => { });
            }
        }
    }

    // Log the consultation resolved event
    await db.query(
        `INSERT INTO patient_events (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
         VALUES ($1, $2, 'consult', $3, 'clinical_consults', $4, $5)`,
        [patient_id, orgId, consult.id, `Consultation resolved: ${findings}`, userId]
    ).catch(() => { });

    return consult;
}

module.exports = { listAll, create, resolve };
