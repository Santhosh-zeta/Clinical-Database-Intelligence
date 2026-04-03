-- ============================================================
-- Migration 016: Clinical Context Tables
-- diagnoses, symptoms, patient_symptoms, patient_events
-- ============================================================

-- ── Clinical Diagnoses ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnoses (
    id              SERIAL PRIMARY KEY,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    doctor_id       INT REFERENCES doctors(id) ON DELETE SET NULL,
    icd10_code      VARCHAR(20),
    diagnosis_text  TEXT NOT NULL,
    severity        VARCHAR(20) NOT NULL DEFAULT 'moderate'
                    CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    type            VARCHAR(20) NOT NULL DEFAULT 'primary'
                    CHECK (type IN ('primary', 'secondary', 'differential')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_admission ON diagnoses(admission_id);
CREATE INDEX idx_diagnoses_keyword ON diagnoses USING GIN (to_tsvector('english', diagnosis_text));

-- ── Symptoms Master Catalog ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptoms (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50)  -- 'cardiac', 'respiratory', 'neurological', etc.
);

-- ── Patient-Symptom Mapping ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_symptoms (
    id           SERIAL PRIMARY KEY,
    patient_id   INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id INT REFERENCES admissions(id) ON DELETE CASCADE,
    symptom_id   INT NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
    severity     VARCHAR(20) DEFAULT 'moderate',
    onset_at     TIMESTAMPTZ DEFAULT NOW(),
    noted_by     INT REFERENCES doctors(id) ON DELETE SET NULL,
    UNIQUE (admission_id, symptom_id)
);

-- ── Patient Event Timeline ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_events (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    event_type      VARCHAR(30) NOT NULL
                    CHECK (event_type IN (
                        'admission', 'discharge', 'vitals', 'alert',
                        'ews_score', 'prescription', 'diagnosis',
                        'transfer', 'icu_escalation', 'symptom'
                    )),
    reference_id    INT,
    reference_table VARCHAR(50),
    description     TEXT NOT NULL,
    metadata        JSONB,
    created_by      INT REFERENCES doctors(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_events_patient ON patient_events(patient_id, created_at DESC);
CREATE INDEX idx_patient_events_org     ON patient_events(organization_id, created_at DESC);
CREATE INDEX idx_patient_events_type    ON patient_events(event_type, created_at DESC);

-- ── Seed Common Symptoms ─────────────────────────────────────────────────────
INSERT INTO symptoms (name, category) VALUES
    ('Chest Pain',         'cardiac'),
    ('Shortness of Breath','respiratory'),
    ('Fever',              'systemic'),
    ('Headache',           'neurological'),
    ('Nausea',             'gastrointestinal'),
    ('Vomiting',           'gastrointestinal'),
    ('Dizziness',          'neurological'),
    ('Fatigue',            'systemic'),
    ('Cough',              'respiratory'),
    ('Abdominal Pain',     'gastrointestinal'),
    ('Palpitations',       'cardiac'),
    ('Sweating',           'systemic'),
    ('Confusion',          'neurological'),
    ('Hypertension',       'cardiac'),
    ('Hypotension',        'cardiac'),
    ('Tachycardia',        'cardiac'),
    ('Bradycardia',        'cardiac'),
    ('Cyanosis',           'respiratory'),
    ('Edema',              'systemic'),
    ('Jaundice',           'hepatic')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE diagnoses IS 'Clinical diagnoses per admission with ICD-10 code support';
COMMENT ON TABLE patient_events IS 'Unified patient event timeline — feeds the clinical timeline UI';
COMMENT ON COLUMN patient_events.metadata IS 'Flexible JSONB payload per event type (vitals snapshot, EWS breakdown, etc.)';
