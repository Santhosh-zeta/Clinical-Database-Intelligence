'use strict';

const db = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/** Get prescription suggestions based on a diagnosis keyword */
async function getSuggestions(diagnosisText) {
    const keyword = diagnosisText.toLowerCase().trim();
    // Fuzzy match against disease_medication_map keywords
    const result = await db.query(
        `SELECT dmm.diagnosis_keyword, dmm.recommended_dose, dmm.recommended_frequency,
                dmm.recommended_route, dmm.priority,
                m.id AS medication_id, m.name AS medication_name,
                m.generic_name, m.category, m.unit
         FROM disease_medication_map dmm
         JOIN medications m ON m.id = dmm.medication_id
         WHERE $1 ILIKE '%' || dmm.diagnosis_keyword || '%'
            OR dmm.diagnosis_keyword ILIKE '%' || $1 || '%'
         ORDER BY dmm.priority ASC`,
        [keyword]
    );
    return result.rows;
}

/** Check drug-drug interactions for a list of medication IDs */
async function checkInteractions(medicationIds) {
    if (!medicationIds || medicationIds.length < 2) return [];
    const result = await db.query(
        `SELECT di.severity, di.description,
                m1.name AS drug1_name, m2.name AS drug2_name
         FROM drug_interactions di
         JOIN medications m1 ON m1.id = di.drug1_id
         JOIN medications m2 ON m2.id = di.drug2_id
         WHERE di.drug1_id = ANY($1::int[])
           AND di.drug2_id = ANY($1::int[])`,
        [medicationIds]
    );
    return result.rows;
}

async function create(body, orgId, prescribedBy) {
    const { admission_id, medication_id, dose, frequency, route, start_date, end_date, notes } = body;

    // Verify admission is in this org
    const check = await db.query(
        `SELECT a.id, a.patient_id FROM admissions a
         WHERE a.id = $1 AND a.organization_id = $2 AND a.status = 'active'`,
        [admission_id, orgId]
    );
    if (!check.rowCount) throw createError('Active admission not found in this organization', 404);

    // Check for interactions with currently active prescriptions
    const activeMeds = await db.query(
        `SELECT medication_id FROM prescriptions
         WHERE admission_id = $1 AND status = 'active'`,
        [admission_id]
    );
    const existingIds = activeMeds.rows.map(r => r.medication_id);
    const allIds = [...new Set([...existingIds, medication_id])];
    const interactions = allIds.length > 1 ? await checkInteractions(allIds) : [];

    const result = await db.query(
        `INSERT INTO prescriptions
            (admission_id, organization_id, prescribed_by, medication_id, dose, frequency, route, start_date, end_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [admission_id, orgId, prescribedBy, medication_id, dose, frequency, route,
         start_date || new Date().toISOString().split('T')[0], end_date, notes]
    );

    // Log to patient timeline
    const { patient_id } = check.rows[0];
    await db.query(
        `INSERT INTO patient_events (patient_id, organization_id, event_type, reference_id, reference_table, description, created_by)
         VALUES ($1,$2,'prescription',$3,'prescriptions','New prescription issued',$4)`,
        [patient_id, orgId, result.rows[0].id, prescribedBy]
    );

    return { prescription: result.rows[0], interactions };
}

async function listByPatient(patientId, orgId) {
    const result = await db.query(
        `SELECT pr.*, m.name AS medication_name, m.generic_name, m.category, m.unit,
                d.name AS prescribed_by_name
         FROM prescriptions pr
         JOIN medications m ON m.id = pr.medication_id
         JOIN doctors    d ON d.id = pr.prescribed_by
         JOIN admissions a ON a.id = pr.admission_id
         WHERE a.patient_id = $1 AND pr.organization_id = $2
         ORDER BY pr.created_at DESC`,
        [patientId, orgId]
    );
    return result.rows;
}

async function cancel(id, orgId) {
    const result = await db.query(
        `UPDATE prescriptions SET status='cancelled', updated_at=NOW()
         WHERE id=$1 AND organization_id=$2 AND status='active' RETURNING *`,
        [id, orgId]
    );
    if (!result.rowCount) throw createError('Active prescription not found', 404);
    return result.rows[0];
}

module.exports = { getSuggestions, checkInteractions, create, listByPatient, cancel };
