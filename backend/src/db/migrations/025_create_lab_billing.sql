CREATE TABLE IF NOT EXISTS lab_tests (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(50),
    normal_range TEXT,
    base_price  DECIMAL(10, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id              SERIAL PRIMARY KEY,
    admission_id    INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    doctor_id       INT REFERENCES doctors(id) ON DELETE SET NULL,
    test_id         INT NOT NULL REFERENCES lab_tests(id),
    priority        VARCHAR(20) DEFAULT 'routine',
    status          VARCHAR(20) DEFAULT 'ordered',
    ordered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collected_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lab_results (
    id              SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    test_id         INT NOT NULL REFERENCES lab_tests(id),
    parameter_name  VARCHAR(100) NOT NULL,
    result_value    VARCHAR(50) NOT NULL,
    is_abnormal     BOOLEAN DEFAULT FALSE,
    technician_id   INT REFERENCES doctors(id),
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id              SERIAL PRIMARY KEY,
    admission_id    INT NOT NULL UNIQUE REFERENCES admissions(id) ON DELETE CASCADE,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL DEFAULT 1,
    total_amount    DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount      DECIMAL(12, 2) DEFAULT 0.00,
    status          VARCHAR(20) DEFAULT 'draft',
    issued_at       TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INT NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    item_type       VARCHAR(50) NOT NULL,
    item_name       VARCHAR(200) NOT NULL,
    unit_price      DECIMAL(12, 2) NOT NULL,
    quantity        DECIMAL(10, 2) DEFAULT 1.00,
    total_price     DECIMAL(12, 2) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_orders_admission ON lab_orders(admission_id);
CREATE INDEX idx_lab_results_order ON lab_results(order_id);
CREATE INDEX idx_billing_invoice_admission ON billing_invoices(admission_id);

INSERT INTO lab_tests (name, category, normal_range, base_price) VALUES
    ('Complete Blood Count (CBC)', 'blood', 'WBC: 4.5-11.0, RBC: 4.5-5.9', 450.00),
    ('Basic Metabolic Panel (BMP)', 'blood', 'Glucose: 70-99, Calcium: 8.5-10.2', 600.00),
    ('Liver Function Test (LFT)',  'blood', 'ALT: 7-55, AST: 8-48', 850.00),
    ('Urinalysis',                 'urine', 'Clear, yellow', 250.00),
    ('Chest X-Ray',                'imaging','Negative for acute process', 1200.00),
    ('ECG / EKG',                  'cardiac','Normal sinus rhythm', 750.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('VIEW_LAB_RESULTS', 'View patient lab investigations'),
    ('ORDER_LAB_TEST',   'Order medical laboratory tests'),
    ('VIEW_BILLING',     'View patient financial records'),
    ('MANAGE_BILLING',   'Manage hospital invoices and pricing')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='doctor'), id FROM permissions WHERE code IN ('VIEW_LAB_RESULTS', 'ORDER_LAB_TEST', 'VIEW_BILLING')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='nurse'), id FROM permissions WHERE code IN ('VIEW_LAB_RESULTS', 'VIEW_BILLING')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='admin'), id FROM permissions WHERE code IN ('VIEW_LAB_RESULTS', 'ORDER_LAB_TEST', 'VIEW_BILLING', 'MANAGE_BILLING')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT (SELECT id FROM roles WHERE name='patient'), id FROM permissions WHERE code IN ('VIEW_LAB_RESULTS', 'VIEW_BILLING')
ON CONFLICT DO NOTHING;
