CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    doctor_id       INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    admission_id    INT REFERENCES admissions(id) ON DELETE CASCADE,
    alert_id        INT REFERENCES alerts(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_doctor  ON notifications(doctor_id, is_read, created_at DESC);

COMMENT ON TABLE notifications IS 'Doctor notification inbox; populated when alerts are generated';
