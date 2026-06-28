CREATE TABLE IF NOT EXISTS wards (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    ward_type       VARCHAR(30) NOT NULL DEFAULT 'general'
                    CHECK (ward_type IN ('general', 'icu', 'surgical', 'paediatric', 'maternity', 'emergency', 'oncology')),
    department_id   INT REFERENCES departments(id) ON DELETE SET NULL,
    total_beds      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beds (
    id              SERIAL PRIMARY KEY,
    bed_number      VARCHAR(20) NOT NULL,
    ward_id         INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    is_occupied     BOOLEAN NOT NULL DEFAULT FALSE,
    is_icu          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bed_number, ward_id)
);

CREATE INDEX idx_beds_ward    ON beds(ward_id);
CREATE INDEX idx_beds_free    ON beds(is_occupied, is_icu);

COMMENT ON TABLE wards IS 'Hospital wards with type classification (ICU, general, etc.)';
COMMENT ON TABLE beds  IS 'Individual beds within a ward, is_icu flag for ICU beds';
