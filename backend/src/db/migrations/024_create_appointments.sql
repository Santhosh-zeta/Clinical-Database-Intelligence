-- ============================================================
-- Migration 024: Appointments & Scheduling
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_appointments (
    id              SERIAL PRIMARY KEY,
    patient_id      INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       INT NOT NULL REFERENCES doctors(id),
    appointment_at  TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled, cancelled, completed
    reason          TEXT,
    location        VARCHAR(100),
    organization_id INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_patient ON patient_appointments(patient_id, appointment_at);
CREATE INDEX idx_appointment_doctor  ON patient_appointments(doctor_id, appointment_at);
