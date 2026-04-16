#!/bin/bash
set -e

echo "🚀 Starting Clinical Intelligence Infrastructure..."

docker-compose down -v
docker network prune -f

echo "🔌 Starting all containers..."
docker-compose up -d --force-recreate --build

echo "⏳ Waiting for database to stabilize (20s)..."
until docker exec clinical-db pg_isready -U postgres -d clinical_db; do
  echo "Still waiting for DB..."
  sleep 5
done
sleep 10

echo "📦 Running database migrations..."
for f in backend/src/db/migrations/*.sql; do
  echo "  ▶ Applying $f..."
  docker exec -i clinical-db psql -U postgres -d clinical_db < "$f"
done

if [ -d "backend/src/db/functions" ]; then
  for f in backend/src/db/functions/*.sql; do
    echo "  ▶ Applying function $f..."
    docker exec -i clinical-db psql -U postgres -d clinical_db < "$f"
  done
fi

echo "🔌 Restarting Backend API..."
docker-compose restart api

echo "⏳ Waiting for API to be healthy..."
until curl -s http://localhost:3001/health; do
  sleep 2
done

echo "🌱 Seeding initial clinical data..."
docker exec -i clinical-db psql -U postgres -d clinical_db <<EOF
-- Root Admin User (password123)
-- Hash: '\$2b\$10\$GLDiv6uy8Pf/qTCqMBSlBOwtmvnrHi2Ebfb/qE0Z3luOPaXoWieaS'
INSERT INTO doctors (id, name, email, password_hash, role, organization_id)
VALUES (1, 'System Admin', 'a1@intellicare.demo', '\$2b\$10\$GLDiv6uy8Pf/qTCqMBSlBOwtmvnrHi2Ebfb/qE0Z3luOPaXoWieaS', 'admin', 1)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (doctor_id, role_id, org_id)
VALUES (1, (SELECT id FROM roles WHERE name='admin'), 1)
ON CONFLICT DO NOTHING;

INSERT INTO wards (name, ward_type, total_beds, organization_id) VALUES
  ('General Ward A','general',10, 1),
  ('ICU','icu',5, 1),
  ('Emergency','emergency',8, 1)
ON CONFLICT DO NOTHING;

INSERT INTO beds (bed_number, ward_id, is_icu, organization_id) VALUES
  ('GEN-01',1,false, 1),('GEN-02',1,false, 1),('GEN-03',1,false, 1),('GEN-04',1,false, 1),('GEN-05',1,false, 1),
  ('ICU-01',2,true, 1),('ICU-02',2,true, 1),('ICU-03',2,true, 1),('ICU-04',2,true, 1),('ICU-05',2,true, 1),
  ('EMG-01',3,false, 1),('EMG-02',3,false, 1),('EMG-03',3,false, 1),('EMG-04',3,false, 1)
ON CONFLICT DO NOTHING;
EOF

echo "🏥 Registering patients and staff via API..."
cd simulator
npm install
node seed.js
cd ..

echo "🩺 Adding clinical handover, consults, and appointments..."
docker exec -i clinical-db psql -U postgres -d clinical_db <<EOF
-- Handover for General Ward A (Ward ID 1)
INSERT INTO ward_handovers (ward_id, author_id, shift_name, summary, organization_id)
VALUES (1, 1, 'Morning Shift', 'Critical handover: Bed 4 stable but needs vitals check every 1h.', 1);

-- Consult for Patient 1
INSERT INTO clinical_consults (patient_id, requesting_dr_id, specialty, priority, reason, organization_id)
VALUES (1, 1, 'Cardiology', 'urgent', 'Abnormal ECG readings detected during simulation.', 1);

-- Appointment for Patient 1
INSERT INTO patient_appointments (patient_id, doctor_id, appointment_at, reason, location, organization_id)
VALUES (1, 1, NOW() + INTERVAL '2 days', 'Post-MI Follow-up', 'Clinic Room 302', 1);
EOF

echo "✅ Initialization Complete!"
echo "📡 API: http://localhost:3001"
echo "🗄️ DB: localhost:5433 (Access via adminer or psql)"
