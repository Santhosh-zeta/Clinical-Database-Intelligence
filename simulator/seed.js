'use strict';

/**
 * seed.js — One-time data seeder.
 * Creates departments, doctors, patients, wards, beds, and admissions
 * via the REST API so the simulator has real IDs to work with.
 *
 * Run once: node seed.js
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const API = process.env.API_URL || 'http://localhost:3001';
const api = axios.create({ baseURL: API, timeout: 10000 });

// ── Authentication ────────────────────────────────────────────────────────────

async function login() {
    try {
        const res = await api.post('/api/auth/login', {
            email: 'seeder@hospital.com',
            password: 'seeder_pass'
        });
        const token = res.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        log.ok('Authenticated successfully');
        return token;
    } catch (err) {
        log.err('Authentication failed: ' + (err.response?.data?.error || err.message));
        process.exit(1);
    }
}


const log = {
    ok: (msg) => console.log(chalk.green('  ✓'), msg),
    info: (msg) => console.log(chalk.cyan('  ▶'), msg),
    warn: (msg) => console.log(chalk.yellow('  ⚠'), msg),
    err: (msg) => console.log(chalk.red('  ✗'), msg),
};

// ── Seed Data ────────────────────────────────────────────────────────────────

const DOCTORS = [
    { name: 'Dr. Ananya Ramesh', email: 'ananya@hospital.com', password: 'Pass@1234', role: 'doctor', specialization: 'Cardiology' },
    { name: 'Dr. Vikram Nair', email: 'vikram@hospital.com', password: 'Pass@1234', role: 'doctor', specialization: 'Pulmonology' },
    { name: 'Dr. Meena Suresh', email: 'meena@hospital.com', password: 'Pass@1234', role: 'doctor', specialization: 'Emergency Medicine' },
    { name: 'Nurse Priya Menon', email: 'priya@hospital.com', password: 'Pass@1234', role: 'nurse', specialization: 'ICU Nursing' },
];

const PATIENTS = [
    { name: 'Rajesh Kumar', date_of_birth: '1965-03-14', gender: 'M', blood_group: 'O+', contact: '9876500001', chronic_conditions: 'Hypertension, Diabetes' },
    { name: 'Sunita Devi', date_of_birth: '1978-07-22', gender: 'F', blood_group: 'B+', contact: '9876500002', chronic_conditions: 'Asthma' },
    { name: 'Arjun Sharma', date_of_birth: '1990-11-05', gender: 'M', blood_group: 'A-', contact: '9876500003', chronic_conditions: 'None' },
    { name: 'Lakshmi Nair', date_of_birth: '1955-01-30', gender: 'F', blood_group: 'AB+', contact: '9876500004', chronic_conditions: 'COPD, Heart Failure' },
    { name: 'Mohan Das', date_of_birth: '1982-09-18', gender: 'M', blood_group: 'O-', contact: '9876500005', chronic_conditions: 'Kidney Disease' },
];

const WARDS = [
    { name: 'General Ward A', ward_type: 'general', total_beds: 10 },
    { name: 'ICU', ward_type: 'icu', total_beds: 5 },
    { name: 'Emergency', ward_type: 'emergency', total_beds: 8 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function post(path, data) {
    const res = await api.post(path, data);
    return res.data.data;
}

async function createBedsForWard(wardId, wardType, count) {
    const results = [];
    for (let i = 1; i <= count; i++) {
        const bed = await post('/api/beds', {
            bed_number: `${wardType.toUpperCase().slice(0, 3)}-${String(i).padStart(2, '0')}`,
            ward_id: wardId,
            is_icu: wardType === 'icu',
        });
        results.push(bed);
    }
    return results;
}

// ── Main Seeder ───────────────────────────────────────────────────────────────

async function seed() {
    console.log(chalk.bold.blue('\n🏥  Clinical System — Data Seeder\n'));

    // 1. Health check
    try {
        await api.get('/health');
        log.ok('API is reachable at ' + API);
    } catch {
        log.err(`Cannot reach API at ${API}. Make sure the backend is running.`);
        process.exit(1);
    }

    // 2. Auth & Doctors
    await login();
    log.info('Creating doctors...');
    const doctors = [];
    for (const d of DOCTORS) {
        try {
            const doc = await post('/api/doctors', d);
            doctors.push(doc);
            log.ok(`Doctor: ${doc.name} (id=${doc.id}, role=${doc.role})`);
        } catch (e) {
            log.warn(`Skipped ${d.name}: ${e.response?.data?.error || e.message}`);
        }
    }

    // 3. Create Patients
    log.info('\nCreating patients...');
    const patients = [];
    for (const p of PATIENTS) {
        try {
            const patient = await post('/api/patients', p);
            patients.push(patient);
            log.ok(`Patient: ${patient.name} (id=${patient.id})`);
        } catch (e) {
            log.warn(`Skipped ${p.name}: ${e.response?.data?.error || e.message}`);
        }
    }

    // 4. Create Wards (direct DB only — no ward route exposed yet, using seed SQL)
    //    We'll add a simple beds endpoint seed
    log.info('\nNote: Run migrations first to create ward/bed tables.');
    log.info('Wards must be inserted via SQL or Supabase UI for now.');
    log.info('Use the SQL below, then re-run with admissions:\n');

    console.log(chalk.gray(`
INSERT INTO wards (name, ward_type, total_beds) VALUES
  ('General Ward A','general',10),
  ('ICU','icu',5),
  ('Emergency','emergency',8);

INSERT INTO beds (bed_number, ward_id, is_icu) VALUES
  ('GEN-01',1,false),('GEN-02',1,false),('GEN-03',1,false),('GEN-04',1,false),('GEN-05',1,false),
  ('ICU-01',2,true),('ICU-02',2,true),('ICU-03',2,true),('ICU-04',2,true),('ICU-05',2,true),
  ('EMG-01',3,false),('EMG-02',3,false),('EMG-03',3,false),('EMG-04',3,false);
  `));

    // 5. Seed summary
    console.log(chalk.bold.green('\n✅ Seed complete!'));
    console.log(chalk.gray(`   Doctors created:  ${doctors.length}`));
    console.log(chalk.gray(`   Patients created: ${patients.length}`));
    console.log(chalk.gray('\n   → Now insert wards/beds via SQL above'));
    console.log(chalk.gray('   → Then run: node simulate.js\n'));
}

seed().catch((e) => {
    log.err(e.message);
    process.exit(1);
});
