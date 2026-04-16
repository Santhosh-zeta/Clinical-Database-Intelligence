ALTER TABLE doctors ADD COLUMN patient_id INTEGER REFERENCES patients(id);
