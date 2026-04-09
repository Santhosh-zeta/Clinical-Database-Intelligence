'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { pool } = require('../backend/src/config/db');

async function setup() {
    console.log('Finalizing Database Setup (Wards, Beds, Doctors)...');

    try {
        // 1. Insert Wards
        console.log('  ▶ Inserting Wards...');
        await pool.query(`
            INSERT INTO wards (name, ward_type, total_beds) VALUES
            ('General Ward A','general',10),
            ('ICU','icu',5),
            ('Emergency','emergency',8)
            ON CONFLICT DO NOTHING
        `);

        // 2. Insert Beds
        console.log('  ▶ Inserting Beds...');
        const wardRes = await pool.query('SELECT id, name, ward_type FROM wards');
        const wards = wardRes.rows;

        for (const ward of wards) {
            const count = ward.name === 'General Ward A' ? 10 : (ward.name === 'ICU' ? 5 : 8);
            const prefix = ward.ward_type.toUpperCase().slice(0, 3);
            for (let i = 1; i <= count; i++) {
                const bedNum = `${prefix}-${String(i).padStart(2, '0')}`;
                await pool.query(`
                    INSERT INTO beds (bed_number, ward_id, is_icu) 
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                `, [bedNum, ward.id, ward.ward_type === 'icu']);
            }
        }

        // 3. Insert Doctors (direct DB bypass since seeding endpoint had issues)
        console.log('  ▶ Inserting Doctors/Staff...');
        const bcrypt = require('bcryptjs');
        const passHash = await bcrypt.hash('Pass@1234', 12);
        
        const staff = [
            { name: 'Dr. Ananya Ramesh', email: 'ananya@hospital.com', role: 'doctor', spec: 'Cardiology' },
            { name: 'Dr. Vikram Nair', email: 'vikram@hospital.com', role: 'doctor', spec: 'Pulmonology' },
            { name: 'Dr. Meena Suresh', email: 'meena@hospital.com', role: 'doctor', spec: 'Emergency Medicine' },
            { name: 'Nurse Priya Menon', email: 'priya@hospital.com', role: 'nurse', spec: 'ICU Nursing' },
        ];

        for (const s of staff) {
            const res = await pool.query(`
                INSERT INTO doctors (name, email, password_hash, role, specialization)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [s.name, s.email, passHash, s.role, s.spec]);
            
            if (res.rowCount > 0) {
                const docId = res.rows[0].id;
                // Assign 'admin' role permissions if it's an admin (none here), 
                // but we should at least add them to user_roles
                const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [s.role]);
                if (roleRes.rowCount > 0) {
                    await pool.query(`
                        INSERT INTO user_roles (doctor_id, role_id, org_id)
                        VALUES ($1, $2, 1)
                        ON CONFLICT DO NOTHING
                    `, [docId, roleRes.rows[0].id]);
                }
            }
        }

        console.log('\n✅ Setup complete! Wards, Beds, and Staff are ready.');
    } catch (err) {
        console.error('  ✗ Setup failed:', err.message);
    } finally {
        await pool.end();
    }
}

setup();
