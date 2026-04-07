'use strict';

const { Router } = require('express');
const db = require('../config/db');

const router = Router();

// ── GET /api/dashboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  console.log('[DEBUG] Hit /api/dashboard/stats');
  return res.json({ message: 'Dashboard stats hit' });
  try {
    const result = await db.query(`
      SELECT
        -- Admissions
        (SELECT COUNT(*) FROM admissions WHERE status = 'active')                        AS active_admissions,
        (SELECT COUNT(*) FROM admissions WHERE status = 'discharged'
          AND discharged_at >= NOW() - INTERVAL '24 hours')                              AS discharged_today,

        -- Patients
        (SELECT COUNT(*) FROM patients)                                                  AS total_patients,

        -- Alerts
        (SELECT COUNT(*) FROM alerts WHERE is_acknowledged = FALSE)                      AS unacknowledged_alerts,
        (SELECT COUNT(*) FROM alerts WHERE severity = 'critical'
          AND is_acknowledged = FALSE)                                                   AS critical_alerts,

        -- ICU
        (SELECT COUNT(*) FROM beds WHERE is_icu = TRUE AND is_occupied = FALSE)          AS available_icu_beds,
        (SELECT COUNT(*) FROM beds WHERE is_icu = TRUE)                                  AS total_icu_beds,

        -- Risk distribution (active admissions only)
        (SELECT COUNT(*) FROM (
            SELECT DISTINCT ON (rs.admission_id) rs.category
            FROM risk_scores rs
            JOIN admissions a ON a.id = rs.admission_id
            WHERE a.status = 'active'
            ORDER BY rs.admission_id, rs.calculated_at DESC
        ) sub WHERE category = 'critical')                                               AS critical_patients,
        (SELECT COUNT(*) FROM (
            SELECT DISTINCT ON (rs.admission_id) rs.category
            FROM risk_scores rs
            JOIN admissions a ON a.id = rs.admission_id
            WHERE a.status = 'active'
            ORDER BY rs.admission_id, rs.calculated_at DESC
        ) sub WHERE category = 'high')                                                   AS high_risk_patients,
        (SELECT COUNT(*) FROM (
            SELECT DISTINCT ON (rs.admission_id) rs.category
            FROM risk_scores rs
            JOIN admissions a ON a.id = rs.admission_id
            WHERE a.status = 'active'
            ORDER BY rs.admission_id, rs.calculated_at DESC
        ) sub WHERE category = 'stable')                                                 AS stable_patients,

        -- Doctor count
        (SELECT COUNT(*) FROM doctors WHERE is_active = TRUE)                            AS active_doctors
    `);

    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
