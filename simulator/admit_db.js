'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function admitAll() {
    console.log('Admitting All Patients into Database (Bypassing API)...');

    try {

        const patients = (await pool.query('SELECT id, name FROM patients')).rows;
        if (patients.length === 0) {
            console.log('  ✗ No patients found. Run seed.js first.');
            return;
        }

        const beds = (await pool.query('SELECT b.id, b.ward_id FROM beds b WHERE b.is_occupied = FALSE ORDER BY b.id')).rows;
        if (beds.length === 0) {
            console.log('  ✗ No free beds found.');
            return;
        }

        console.log('  ▶ Clearing existing active admissions...');
        await pool.query("UPDATE admissions SET status = 'discharged', discharged_at = NOW() WHERE status = 'active'");
        await pool.query("UPDATE beds SET is_occupied = FALSE");

        const diags = ['Acute Respiratory Distress', 'Septic Shock', 'High Fever', 'Severe Cough', 'Post-Op Recovery'];
        const limit = Math.min(patients.length, beds.length);

        console.log(`  ▶ Admitting ${limit} patients...`);
        for (let i = 0; i < limit; i++) {
            const p = patients[i];
            const b = beds[i];

            await pool.query(`
                INSERT INTO admissions (patient_id, doctor_id, ward_id, bed_id, diagnosis, notes, organization_id, status)
                VALUES ($1, 1, $2, $3, $4, 'SIMULATED ADMISSION', 1, 'active')
            `, [p.id, b.ward_id, b.id, diags[i % diags.length]]);

            await pool.query('UPDATE beds SET is_occupied = TRUE WHERE id = $1', [b.id]);
            console.log(`  ✓ Admitted: ${p.name} (ID: ${p.id}) to Bed ID: ${b.id}`);
        }

        console.log('\n✅ All patients admitted! Ready for simulation.');
    } catch (err) {
        console.error('  ✗ Admission failed:', err.message);
    } finally {
        await pool.end();
    }
}

admitAll();
