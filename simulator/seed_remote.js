const axios = require('axios');
const chalk = require('chalk');

const API = 'https://clinical-database-intelligence.onrender.com';
const api = axios.create({ baseURL: API, timeout: 20000 });

async function seed() {
    try {
        console.log('Logging in...');
        const res = await api.post('/api/auth/login', { email: 'a1@intellicare.demo', password: 'password123' });
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        console.log('Logged in successfully');

        console.log('Creating Wards...');
        const w1 = await api.post('/api/wards', { name: 'General Ward A', ward_type: 'general', total_beds: 10 });
        const w2 = await api.post('/api/wards', { name: 'ICU', ward_type: 'icu', total_beds: 5 });
        const w3 = await api.post('/api/wards', { name: 'Emergency', ward_type: 'emergency', total_beds: 8 });

        const wardIds = { general: w1.data.data.id, icu: w2.data.data.id, emergency: w3.data.data.id };
        console.log('Wards created:', wardIds);

        console.log('Creating Beds...');
        const beds = [];
        for(let i=1; i<=10; i++) {
            const b = await api.post('/api/beds', { bed_number: `GEN-${i}`, ward_id: wardIds.general, is_icu: false });
            beds.push(b.data.data);
        }
        for(let i=1; i<=5; i++) {
            const b = await api.post('/api/beds', { bed_number: `ICU-${i}`, ward_id: wardIds.icu, is_icu: true });
            beds.push(b.data.data);
        }
        console.log(`Created ${beds.length} Beds`);

        console.log('Creating Doctors & Patients...');
        const doc = await api.post('/api/admin/staff', { name: 'Dr. Sarah Connor', email: 'sarah@hospital.com', password: 'password', role: 'doctor' });
        const dId = doc.data.data.id;

        const p1 = await api.post('/api/patients', { name: 'John Doe', date_of_birth: '1980-01-01', gender: 'M' });
        const p2 = await api.post('/api/patients', { name: 'Jane Smith', date_of_birth: '1975-05-15', gender: 'F' });
        
        console.log('Admitting Patients...');
        const a1 = await api.post('/api/admissions', {
            patient_id: p1.data.data.id,
            doctor_id: dId,
            ward_id: wardIds.general,
            bed_id: beds.find(b => b.ward_id === wardIds.general && !b.is_occupied).id,
            diagnosis: 'Pneumonia',
            notes: 'Requires oxygen'
        });

        const a2 = await api.post('/api/admissions', {
            patient_id: p2.data.data.id,
            doctor_id: dId,
            ward_id: wardIds.icu,
            bed_id: beds.find(b => b.ward_id === wardIds.icu && !b.is_occupied).id,
            diagnosis: 'Cardiac Arrest',
            notes: 'Critical condition'
        });

        console.log('Created Admissions:', a1.data.data.id, a2.data.data.id);
        console.log('Seed completed successfully!');

    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}
seed();
