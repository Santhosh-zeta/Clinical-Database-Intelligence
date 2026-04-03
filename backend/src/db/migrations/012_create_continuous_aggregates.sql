-- ============================================================
-- Migration 012: Continuous Aggregates for Vitals
-- ============================================================

-- Create 1-minute bucket materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS vitals_1m
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', recorded_at) AS bucket,
       admission_id,
       ROUND(AVG(heart_rate)) as avg_hr,
       ROUND(AVG(systolic_bp)) as avg_sys,
       ROUND(AVG(diastolic_bp)) as avg_dia,
       ROUND(AVG(spo2), 2) as avg_spo2,
       ROUND(AVG(temperature), 1) as avg_temp
FROM vitals
GROUP BY bucket, admission_id;

-- Add a policy to refresh it every minute
SELECT add_continuous_aggregate_policy('vitals_1m',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE
);
