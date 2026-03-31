-- ============================================================
-- Migration 002: Doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'doctor'  -- doctor | nurse | admin
                    CHECK (role IN ('doctor', 'nurse', 'admin')),
    specialization  VARCHAR(100),
    department_id   INT REFERENCES departments(id) ON DELETE SET NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Back-fill head_doctor_id FK on departments
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head
    FOREIGN KEY (head_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

CREATE INDEX idx_doctors_dept ON doctors(department_id);

COMMENT ON TABLE doctors IS 'Doctors, nurses, and admin staff with login credentials';
