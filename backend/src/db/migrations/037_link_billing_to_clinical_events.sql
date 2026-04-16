ALTER TABLE billing_items
ADD COLUMN consult_id INTEGER REFERENCES clinical_consults(id) ON DELETE SET NULL,
ADD COLUMN lab_order_id INTEGER REFERENCES lab_orders(id) ON DELETE SET NULL;

CREATE INDEX idx_billing_items_consult ON billing_items(consult_id);
CREATE INDEX idx_billing_items_lab_order ON billing_items(lab_order_id);

COMMENT ON COLUMN billing_items.consult_id IS 'Link to the specific clinical consultation that triggered this charge';
COMMENT ON COLUMN billing_items.lab_order_id IS 'Link to the specific lab order that triggered this charge';
