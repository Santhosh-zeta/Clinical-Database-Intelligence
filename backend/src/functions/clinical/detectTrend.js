'use strict';

/**
 * Detects deteriorating trends in vitals over a window.
 */
function detectTrend(rows, windowSize) {
    const alerts = [];
    const deltas = {};
    let deteriorating = false;

    if (rows.length < 3) return { deteriorating, alerts, deltas };

    const vitals = ['heart_rate', 'systolic_bp', 'spo2', 'temperature', 'respiratory_rate'];

    vitals.forEach(v => {
        const values = rows.map(r => r[v]).filter(val => val !== null && val !== undefined);
        if (values.length < 3) return;

        const first = values[0];
        const last = values[values.length - 1];
        const delta = last - first;
        deltas[v] = delta;

        // Examples of deteriorating trends
        if (v === 'heart_rate' && delta > 20) {
            deteriorating = true;
            alerts.push(`Rising heart rate (+${delta} bpm)`);
        }
        if (v === 'spo2' && delta < -3) {
            deteriorating = true;
            alerts.push(`Falling oxygen saturation (${delta}%)`);
        }
        if (v === 'systolic_bp' && delta < -20) {
            deteriorating = true;
            alerts.push(`Falling blood pressure (${delta} mmHg)`);
        }
        if (v === 'respiratory_rate' && delta > 5) {
            deteriorating = true;
            alerts.push(`Increasing respiratory distress (+${delta}/min)`);
        }
    });

    return { deteriorating, alerts, deltas };
}

module.exports = { detectTrend };
