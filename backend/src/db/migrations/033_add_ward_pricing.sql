ALTER TABLE wards ADD COLUMN IF NOT EXISTS base_price_per_day DECIMAL(10, 2) DEFAULT 1200.00;

UPDATE wards SET base_price_per_day = 5500.00 WHERE ward_type = 'icu';
UPDATE wards SET base_price_per_day = 3200.00 WHERE ward_type = 'surgical';
UPDATE wards SET base_price_per_day = 1200.00 WHERE ward_type = 'general';
UPDATE wards SET base_price_per_day = 4500.00 WHERE ward_type = 'emergency';
UPDATE wards SET base_price_per_day = 1800.00 WHERE ward_type = 'maternity';

ALTER TABLE medications ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2) DEFAULT 15.00;

UPDATE medications SET price_per_unit = 250.00 WHERE name ILIKE '%insulin%';
UPDATE medications SET price_per_unit = 50.00 WHERE name ILIKE '%antibiotic%';
UPDATE medications SET price_per_unit = 10.00 WHERE name ILIKE '%aspirin%';
UPDATE medications SET price_per_unit = 20.00 WHERE name ILIKE '%paracetamol%';
