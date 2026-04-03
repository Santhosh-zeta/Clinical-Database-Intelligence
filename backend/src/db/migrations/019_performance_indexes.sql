-- ============================================================
-- Migration 019: Performance Indexes
-- ============================================================

-- Multi-tenant query optimization (most critical)
CREATE INDEX IF NOT EXISTS idx_patients_org
    ON patients(organization_id);

CREATE INDEX IF NOT EXISTS idx_admissions_org_status
    ON admissions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_admissions_org_status_time
    ON admissions(organization_id, status, admitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_org_unacked
    ON alerts(organization_id, is_acknowledged)
    WHERE is_acknowledged = FALSE;

-- EWS + events
CREATE INDEX IF NOT EXISTS idx_ews_admission_time
    ON ews_scores(admission_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_events_patient_time
    ON patient_events(patient_id, created_at DESC);

-- Active admissions per org (most queried state)
CREATE INDEX IF NOT EXISTS idx_admissions_active_org
    ON admissions(organization_id, patient_id, doctor_id)
    WHERE status = 'active';

-- Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_org_status
    ON prescriptions(organization_id, status);

-- Drug interaction lookup (bidirectional)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_d1 ON drug_interactions(drug1_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_d2 ON drug_interactions(drug2_id);

-- Fuzzy patient name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
    ON patients USING GIN (name gin_trgm_ops);

-- Covering index for admissions list (avoids heap fetch for common query)
CREATE INDEX IF NOT EXISTS idx_admissions_covering
    ON admissions(organization_id, status, admitted_at DESC)
    INCLUDE (patient_id, doctor_id, ward_id, bed_id, diagnosis);
