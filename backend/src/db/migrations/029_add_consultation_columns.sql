ALTER TABLE clinical_consults
ADD COLUMN IF NOT EXISTS responding_dr_id INT REFERENCES doctors(id),
ADD COLUMN IF NOT EXISTS findings        TEXT,
ADD COLUMN IF NOT EXISTS recommendations TEXT,
ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_consult_responding_dr ON clinical_consults(responding_dr_id);
