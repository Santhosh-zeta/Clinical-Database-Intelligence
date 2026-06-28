CREATE TABLE IF NOT EXISTS medications (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    generic_name VARCHAR(100),
    category     VARCHAR(50),
    unit         VARCHAR(20) NOT NULL DEFAULT 'mg',
    description  TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id              SERIAL PRIMARY KEY,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    prescribed_by   INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    medication_id   INT NOT NULL REFERENCES medications(id),
    dose            VARCHAR(50) NOT NULL,
    frequency       VARCHAR(50) NOT NULL,
    route           VARCHAR(30) NOT NULL DEFAULT 'oral'
                    CHECK (route IN ('oral','IV','IM','SQ','topical','inhaled','sublingual')),
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','cancelled','on_hold')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disease_medication_map (
    id                    SERIAL PRIMARY KEY,
    diagnosis_keyword     VARCHAR(100) NOT NULL,
    medication_id         INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    recommended_dose      VARCHAR(50),
    recommended_frequency VARCHAR(30),
    recommended_route     VARCHAR(30) DEFAULT 'oral',
    priority              SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS drug_interactions (
    id          SERIAL PRIMARY KEY,
    drug1_id    INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    drug2_id    INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    severity    VARCHAR(20) NOT NULL CHECK (severity IN ('contraindicated','major','moderate','minor')),
    description TEXT,
    UNIQUE (drug1_id, drug2_id),
    CHECK (drug1_id < drug2_id)
);

CREATE INDEX idx_prescriptions_admission ON prescriptions(admission_id, status);
CREATE INDEX idx_disease_med_keyword     ON disease_medication_map(diagnosis_keyword);

INSERT INTO medications (name, generic_name, category, unit) VALUES
    ('Paracetamol 500mg',   'Acetaminophen',          'analgesic',               'mg'),
    ('Amoxicillin 500mg',   'Amoxicillin',            'antibiotic',              'mg'),
    ('Metoprolol 25mg',     'Metoprolol',             'antihypertensive',        'mg'),
    ('Aspirin 75mg',        'Acetylsalicylic Acid',   'antiplatelet',            'mg'),
    ('Furosemide 40mg',     'Furosemide',             'diuretic',                'mg'),
    ('Atorvastatin 10mg',   'Atorvastatin',           'statin',                  'mg'),
    ('Insulin Regular',     'Human Insulin',          'antidiabetic',            'IU'),
    ('Metformin 500mg',     'Metformin',              'antidiabetic',            'mg'),
    ('Salbutamol Inhaler',  'Albuterol',              'bronchodilator',          'mcg'),
    ('Omeprazole 20mg',     'Omeprazole',             'proton_pump_inhibitor',   'mg'),
    ('Amlodipine 5mg',      'Amlodipine',             'calcium_channel_blocker', 'mg'),
    ('Ceftriaxone 1g',      'Ceftriaxone',            'antibiotic',              'g'),
    ('Morphine 10mg',       'Morphine',               'opioid_analgesic',        'mg'),
    ('Heparin 5000IU',      'Heparin',                'anticoagulant',           'IU'),
    ('Dexamethasone 4mg',   'Dexamethasone',          'corticosteroid',          'mg')
ON CONFLICT (name) DO NOTHING;

INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'hypertension',  id, '25mg',   'BID',  1 FROM medications WHERE name='Metoprolol 25mg'  ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'hypertension',  id, '5mg',    'OD',   2 FROM medications WHERE name='Amlodipine 5mg'   ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'diabetes',      id, '500mg',  'BID',  1 FROM medications WHERE name='Metformin 500mg'  ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'diabetes',      id, '10 IU',  'AC',   2 FROM medications WHERE name='Insulin Regular'  ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'pneumonia',     id, '500mg',  'TID',  1 FROM medications WHERE name='Amoxicillin 500mg' ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'pneumonia',     id, '1g',     'OD',   2 FROM medications WHERE name='Ceftriaxone 1g'   ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'chest pain',    id, '300mg',  'STAT', 1 FROM medications WHERE name='Aspirin 75mg'     ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'chest pain',    id, '5mg',    'PRN',  2 FROM medications WHERE name='Morphine 10mg'    ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'fever',         id, '500mg',  'QID',  1 FROM medications WHERE name='Paracetamol 500mg' ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'asthma',        id, '200mcg', 'PRN',  1 FROM medications WHERE name='Salbutamol Inhaler' ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'heart failure', id, '40mg',   'OD',   1 FROM medications WHERE name='Furosemide 40mg'  ON CONFLICT DO NOTHING;
INSERT INTO disease_medication_map (diagnosis_keyword, medication_id, recommended_dose, recommended_frequency, priority)
SELECT 'heart failure', id, '25mg',   'BID',  2 FROM medications WHERE name='Metoprolol 25mg'  ON CONFLICT DO NOTHING;

INSERT INTO drug_interactions (drug1_id, drug2_id, severity, description)
SELECT LEAST(m1.id,m2.id), GREATEST(m1.id,m2.id),
       'major', 'Concurrent use significantly increases bleeding risk'
FROM medications m1, medications m2
WHERE m1.name='Aspirin 75mg' AND m2.name='Heparin 5000IU'
ON CONFLICT DO NOTHING;

INSERT INTO drug_interactions (drug1_id, drug2_id, severity, description)
SELECT LEAST(m1.id,m2.id), GREATEST(m1.id,m2.id),
       'moderate', 'May potentiate hypotension, monitor BP closely'
FROM medications m1, medications m2
WHERE m1.name='Furosemide 40mg' AND m2.name='Amlodipine 5mg'
ON CONFLICT DO NOTHING;

INSERT INTO drug_interactions (drug1_id, drug2_id, severity, description)
SELECT LEAST(m1.id,m2.id), GREATEST(m1.id,m2.id),
       'moderate', 'Corticosteroid raises blood glucose, insulin dose adjustment needed'
FROM medications m1, medications m2
WHERE m1.name='Insulin Regular' AND m2.name='Dexamethasone 4mg'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE disease_medication_map IS 'Rule-based prescription suggestion engine — maps diagnosis keywords to recommended medications';
COMMENT ON TABLE drug_interactions IS 'Drug-drug interaction database, CHECK constraint prevents duplicate reverse pairs';
