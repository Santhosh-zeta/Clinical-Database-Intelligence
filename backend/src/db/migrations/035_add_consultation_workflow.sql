ALTER TABLE clinical_consults
ADD COLUMN IF NOT EXISTS proposed_plan JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_consult_workflow ON clinical_consults(status) WHERE status = 'under_review';
