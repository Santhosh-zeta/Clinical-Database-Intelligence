-- ============================================================
-- Migration 023: Clinical Consultations
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_consults (
    id              SERIAL PRIMARY KEY,
    patient_id      INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requesting_dr_id INT NOT NULL REFERENCES doctors(id),
    specialty       VARCHAR(100) NOT NULL,
    priority        VARCHAR(20) DEFAULT 'routine',
    reason          TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending', -- pending, scheduled, completed, cancelled
    organization_id INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consult_patient ON clinical_consults(patient_id);
CREATE INDEX idx_consult_status  ON clinical_consults(status, priority);
