-- ============================================================
-- Migration 005: Admissions
-- ============================================================
CREATE TABLE IF NOT EXISTS admissions (
    id              SERIAL PRIMARY KEY,
    patient_id      INT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id       INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    ward_id         INT REFERENCES wards(id) ON DELETE SET NULL,
    bed_id          INT REFERENCES beds(id) ON DELETE SET NULL,
    admitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discharged_at   TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'discharged', 'transferred', 'deceased')),
    diagnosis       TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_status  ON admissions(status);
CREATE INDEX idx_admissions_doctor  ON admissions(doctor_id);

COMMENT ON TABLE admissions IS 'Patient admission records linking patient, doctor, ward, and bed';
