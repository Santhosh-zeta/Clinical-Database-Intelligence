'use strict';
require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const EMAIL = 'a1@intellicare.demo';
const PASSWORD = 'password123';

async function main() {
    try {
        console.log('Admitting Patients for Simulation...');
        const authRes = await axios.post(`${API_BASE}/api/auth/login`, { email: EMAIL, password: PASSWORD });
        const token = authRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch available patients
        const patientsRes = await axios.get(`${API_BASE}/api/patients`, { headers });
        const patients = patientsRes.data.data || [];

        // 2. Fetch bed status to find free beds
        const bedsRes = await axios.get(`${API_BASE}/api/admin/bed-status`, { headers });
        const allBeds = bedsRes.data.data || [];
        const freeBeds = allBeds.filter(b => !b.is_occupied);

        if (freeBeds.length === 0) {
            console.log('  ⚠ No free beds available.');
            return;
        }

        let admittedCount = 0;
        const diags = ['Acute Respiratory Distress', 'Septic Shock', 'High Fever', 'Severe Cough', 'Post-Op Recovery'];

        for (const p of patients) {
            if (admittedCount >= freeBeds.length) break;
            try {
                const bed = freeBeds[admittedCount];
                await axios.post(`${API_BASE}/api/admissions`, {
                    patient_id: p.id,
                    doctor_id: 1,
                    ward_id: bed.ward_id,
                    bed_id: bed.bed_id,
                    diagnosis: diags[p.id % diags.length],
                    notes: 'Simulated admission via script'
                }, { headers });
                console.log(`  ✓ Admitted patient ${p.id} (${p.name}) to Ward ${bed.ward_name} Bed ${bed.bed_number}`);
                admittedCount++;
            } catch (e) {
                if (e.response?.status === 409) {
                    console.log(`  ⚠ Patient ${p.id} (${p.name}) already admitted.`);
                } else {
                    console.error(`  ✕ Error admitting patient ${p.id}:`, e.response?.data?.error || e.message);
                }
            }
        }
        console.log('\nAdmissions complete. You can now run node simulate.js');
    } catch (e) { console.error('Fatal error:', e.message); }
}
main();
