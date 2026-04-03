'use strict';

const db = require('../../config/db');

/**
 * assignICUBed — Smart ICU bed allocation (JS layer)
 * Wraps and extends the DB auto_escalate_to_icu() function.
 * Adds JS-level pre-checks before calling the DB function.
 *
 * @param {number} admissionId
 * @param {number} orgId
 * @returns {{ success, bedId, wardId, message }}
 */
async function assignICUBed(admissionId, orgId) {
    // Check if already in ICU
    const current = await db.query(
        `SELECT b.is_icu FROM admissions a
         JOIN beds b ON b.id = a.bed_id
         WHERE a.id = $1`,
        [admissionId]
    );
    if (current.rows[0]?.is_icu) {
        return { success: false, message: 'Patient already in ICU bed', alreadyICU: true };
    }

    // Check org auto-assign setting
    const setting = await db.query(
        `SELECT icu_auto_assign FROM organization_settings WHERE org_id = $1`,
        [orgId]
    );
    if (setting.rows[0]?.icu_auto_assign === false) {
        return { success: false, message: 'ICU auto-assign is disabled for this organization' };
    }

    // Find best ICU bed (prefer same department)
    const best = await db.query(
        `SELECT b.id AS bed_id, b.ward_id
         FROM beds b
         JOIN wards w ON w.id = b.ward_id
         WHERE b.is_icu = TRUE
           AND b.is_occupied = FALSE
           AND b.organization_id = $1
           AND w.department_id = (
               SELECT w2.department_id FROM wards w2
               JOIN admissions a2 ON a2.ward_id = w2.id
               WHERE a2.id = $2
           )
         ORDER BY b.id LIMIT 1`,
        [orgId, admissionId]
    );

    // Fallback: any ICU bed in org
    const fallback = best.rowCount === 0 ? await db.query(
        `SELECT id AS bed_id, ward_id FROM beds
         WHERE is_icu = TRUE AND is_occupied = FALSE AND organization_id = $1
         ORDER BY id LIMIT 1`,
        [orgId]
    ) : null;

    const row = best.rows[0] || fallback?.rows[0];
    if (!row) {
        return { success: false, message: 'No ICU beds available in this organization' };
    }

    // Call existing DB function to do the full assignment + audit + alerts
    await db.query('SELECT auto_escalate_to_icu($1)', [admissionId]);

    return {
        success: true,
        bedId:   row.bed_id,
        wardId:  row.ward_id,
        message: `Patient assigned to ICU bed #${row.bed_id}`,
    };
}

module.exports = { assignICUBed };
