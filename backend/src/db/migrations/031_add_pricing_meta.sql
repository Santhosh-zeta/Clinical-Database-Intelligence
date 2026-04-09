-- ============================================================
-- Migration 031: Pricing Metadata
-- ============================================================

-- Add base price per day to wards
ALTER TABLE wards
    ADD COLUMN base_price_per_day DECIMAL(12, 2) NOT NULL DEFAULT 500.00;

-- Add price per unit to medications
ALTER TABLE medications
    ADD COLUMN price_per_unit DECIMAL(12, 2) NOT NULL DEFAULT 10.00;

-- Update defaults with more realistic tiered pricing
UPDATE wards SET base_price_per_day = 1500.00 WHERE ward_type = 'icu';
UPDATE wards SET base_price_per_day = 1000.00 WHERE ward_type = 'surgical';
UPDATE wards SET base_price_per_day = 800.00  WHERE ward_type = 'paediatric' OR ward_type = 'maternity';
UPDATE wards SET base_price_per_day = 500.00  WHERE ward_type = 'general';

-- Update some medications with specific pricing
UPDATE medications SET price_per_unit = 5.00   WHERE name LIKE 'Paracetamol%';
UPDATE medications SET price_per_unit = 25.00  WHERE name LIKE 'Amoxicillin%';
UPDATE medications SET price_per_unit = 150.00 WHERE name LIKE 'Ceftriaxone%';
UPDATE medications SET price_per_unit = 200.00 WHERE name LIKE 'Morphine%';
UPDATE medications SET price_per_unit = 45.00  WHERE name LIKE 'Insulin%';
