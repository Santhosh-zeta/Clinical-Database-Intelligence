CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INT,
    action          VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_by      INT REFERENCES doctors(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET
);

CREATE INDEX idx_audit_table   ON audit_logs(table_name, changed_at DESC);
CREATE INDEX idx_audit_record  ON audit_logs(table_name, record_id);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all critical data changes, populated by triggers';
