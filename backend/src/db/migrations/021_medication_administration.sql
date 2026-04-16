CREATE TABLE IF NOT EXISTS medication_administrations (
    id              SERIAL PRIMARY KEY,
    prescription_id INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    administered_by INT NOT NULL REFERENCES doctors(id),
    administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dose_given      VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'given'
                    CHECK (status IN ('given', 'missed', 'refused', 'held')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_med_admin_prescription ON medication_administrations(prescription_id);
CREATE INDEX idx_med_admin_time         ON medication_administrations(administered_at DESC);

CREATE OR REPLACE VIEW v_pending_medications AS
SELECT
    p.id AS prescription_id,
    p.admission_id,
    p.organization_id,
    p.medication_id,
    m.name AS medication_name,
    p.dose,
    p.frequency,
    p.route,
    a.patient_id,
    pat.name AS patient_name,
    w.name AS ward_name,
    b.bed_number,
    (SELECT MAX(administered_at) FROM medication_administrations WHERE prescription_id = p.id) AS last_administered
FROM prescriptions p
JOIN medications m ON m.id = p.medication_id
JOIN admissions a ON a.id = p.admission_id
JOIN patients pat ON pat.id = a.patient_id
JOIN wards w ON w.id = a.ward_id
JOIN beds b ON b.id = a.bed_id
WHERE p.status = 'active'
AND a.status = 'active';

COMMENT ON TABLE medication_administrations IS 'Tracks each instance of a medication being given to a patient';
