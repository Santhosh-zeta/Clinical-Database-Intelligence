-- Migration to link staff members to patient records (for self-monitoring or demo accounts)
ALTER TABLE doctors ADD COLUMN patient_id INTEGER REFERENCES patients(id);
