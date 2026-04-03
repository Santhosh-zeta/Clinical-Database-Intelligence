'use strict';

/**
 * detectTrend — Rapid deterioration detector (JS layer)
 * Compares latest N vitals readings for rate-of-change.
 *
 * @param {Array} vitalsArray  Ascending time-sorted vitals objects
 * @param {number} window      How many readings to compare (default 5)
 * @returns {{ deteriorating, alerts: string[], deltas }}
 */
function detectTrend(vitalsArray = [], window = 5) {
    if (vitalsArray.length < 2) {
        return { deteriorating: false, alerts: [], deltas: {} };
    }

    const recent = vitalsArray.slice(-window);
    const first  = recent[0];
    const last   = recent[recent.length - 1];

    const deltas = {
        heart_rate:       safeD(last.heart_rate,       first.heart_rate),
        systolic_bp:      safeD(last.systolic_bp,      first.systolic_bp),
        spo2:             safeD(last.spo2,             first.spo2),
        temperature:      safeD(last.temperature,      first.temperature),
        respiratory_rate: safeD(last.respiratory_rate, first.respiratory_rate),
    };

    const alerts = [];

    // Rapid tachycardia (HR rise > 30 bpm)
    if (deltas.heart_rate !== null && deltas.heart_rate > 30)
        alerts.push(`Rapid HR rise: +${deltas.heart_rate} bpm over last ${recent.length} readings`);

    // Rapid bradycardia (HR drop > 20 bpm)
    if (deltas.heart_rate !== null && deltas.heart_rate < -20)
        alerts.push(`Rapid HR drop: ${deltas.heart_rate} bpm over last ${recent.length} readings`);

    // SpO2 decline > 5%
    if (deltas.spo2 !== null && deltas.spo2 < -5)
        alerts.push(`Rapid SpO2 decline: ${deltas.spo2}% over last ${recent.length} readings`);

    // BP crash (systolic drop > 30 mmHg)
    if (deltas.systolic_bp !== null && deltas.systolic_bp < -30)
        alerts.push(`Rapid BP crash: ${deltas.systolic_bp} mmHg over last ${recent.length} readings`);

    // Hypertensive surge (systolic rise > 40 mmHg)
    if (deltas.systolic_bp !== null && deltas.systolic_bp > 40)
        alerts.push(`Hypertensive surge: +${deltas.systolic_bp} mmHg over last ${recent.length} readings`);

    // RR increase > 8 breaths/min
    if (deltas.respiratory_rate !== null && deltas.respiratory_rate > 8)
        alerts.push(`Respiratory distress trend: +${deltas.respiratory_rate} breaths/min`);

    return {
        deteriorating: alerts.length > 0,
        alerts,
        deltas,
    };
}

function safeD(a, b) {
    if (a == null || b == null) return null;
    return Math.round((parseFloat(a) - parseFloat(b)) * 10) / 10;
}

module.exports = { detectTrend };
