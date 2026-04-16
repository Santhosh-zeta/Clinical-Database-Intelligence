CREATE TABLE IF NOT EXISTS patients (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          CHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    blood_group     VARCHAR(5),
    contact         VARCHAR(20),
    emergency_contact VARCHAR(20),
    address         TEXT,
    allergies       TEXT,
    chronic_conditions TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_name ON patients(name);

COMMENT ON TABLE patients IS 'Core patient demographics and medical history flags';
