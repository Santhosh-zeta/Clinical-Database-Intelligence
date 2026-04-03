'use strict';

/**
 * calculateEWS — NEWS2 Early Warning Score (JavaScript layer)
 * Pure function: no DB, no HTTP. Used in services + unit tests.
 *
 * @param {object} vitals { heart_rate, systolic_bp, spo2, temperature, respiratory_rate }
 * @returns {{ score, category, breakdown }}
 */
function calculateEWS(vitals = {}) {
    const { heart_rate, systolic_bp, spo2, temperature, respiratory_rate } = vitals;
    const breakdown = {};

    // Respiratory Rate
    breakdown.rr = scoreRR(respiratory_rate);
    // SpO2
    breakdown.spo2 = scoreSpO2(spo2);
    // Temperature
    breakdown.temp = scoreTemp(temperature);
    // Systolic BP
    breakdown.bp = scoreBP(systolic_bp);
    // Heart Rate
    breakdown.hr = scoreHR(heart_rate);
    // Consciousness (default 0 — Alert; updated by nurse separately)
    breakdown.consciousness = 0;

    const total = Math.min(
        Object.values(breakdown).reduce((s, v) => s + v, 0),
        20
    );

    return {
        score:     total,
        category:  getCategory(total),
        breakdown,
    };
}

function scoreRR(rr) {
    if (rr == null) return 0;
    if (rr <= 8)  return 3;
    if (rr <= 11) return 1;
    if (rr <= 20) return 0;
    if (rr <= 24) return 2;
    return 3;
}

function scoreSpO2(spo2) {
    if (spo2 == null) return 0;
    if (spo2 <= 91) return 3;
    if (spo2 <= 93) return 2;
    if (spo2 <= 95) return 1;
    return 0;
}

function scoreTemp(temp) {
    if (temp == null) return 0;
    if (temp <= 35.0) return 3;
    if (temp <= 36.0) return 1;
    if (temp <= 38.0) return 0;
    if (temp <= 39.0) return 1;
    return 2;
}

function scoreBP(sys) {
    if (sys == null) return 0;
    if (sys <= 90)  return 3;
    if (sys <= 100) return 2;
    if (sys <= 110) return 1;
    if (sys <= 219) return 0;
    return 3;
}

function scoreHR(hr) {
    if (hr == null) return 0;
    if (hr <= 40)  return 3;
    if (hr <= 50)  return 1;
    if (hr <= 90)  return 0;
    if (hr <= 110) return 1;
    if (hr <= 130) return 2;
    return 3;
}

function getCategory(score) {
    if (score >= 7) return 'urgent';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
}

module.exports = { calculateEWS, scoreRR, scoreSpO2, scoreTemp, scoreBP, scoreHR, getCategory };
