'use strict';

/**
 * Trend detection using ordinary least-squares linear regression.
 *
 * For each vital, fits y = a + b*t over the window of recent readings.
 * A trend is flagged as deteriorating when the slope (b) exceeds a
 * clinically-meaningful threshold AND the R² confirms the trend is
 * not random noise.
 *
 * This is intentionally a statistical heuristic, not a clinical predictor.
 */

// Minimum R² to trust the regression line (0.5 = moderate fit)
const MIN_R2 = 0.40;

// Thresholds: slope (per reading) that constitutes meaningful deterioration
const THRESHOLDS = {
    heart_rate:       { rising: 3,    falling: null },
    spo2:             { rising: null, falling: -0.5 },
    systolic_bp:      { rising: null, falling: -3   },
    respiratory_rate: { rising: 1.5,  falling: null },
    temperature:      { rising: 0.15, falling: null },
};

function ols(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, r2: 0 };

    const xs = values.map((_, i) => i);
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - xMean;
        const dy = values[i] - yMean;
        sxy += dx * dy;
        sxx += dx * dx;
        syy += dy * dy;
    }

    const slope = sxx === 0 ? 0 : sxy / sxx;
    const r2 = (sxx === 0 || syy === 0) ? 0 : (sxy * sxy) / (sxx * syy);
    return { slope: parseFloat(slope.toFixed(4)), r2: parseFloat(r2.toFixed(4)) };
}

function detectTrend(rows, windowSize = 10) {
    const alerts = [];
    const deltas = {};
    const regressions = {};
    let deteriorating = false;

    if (!rows || rows.length < 3) return { deteriorating, alerts, deltas, regressions };

    const vitals = Object.keys(THRESHOLDS);

    for (const key of vitals) {
        const values = rows.map(r => r[key]).filter(v => v !== null && v !== undefined);
        if (values.length < 3) continue;

        const { slope, r2 } = ols(values);
        deltas[key]       = parseFloat((values[values.length - 1] - values[0]).toFixed(2));
        regressions[key]  = { slope, r2 };

        const thr = THRESHOLDS[key];

        if (r2 < MIN_R2) continue;

        if (thr.rising !== null && slope >= thr.rising) {
            deteriorating = true;
            alerts.push(`${fmt(key)} rising (slope +${slope.toFixed(2)}/reading, R²=${r2.toFixed(2)})`);
        }

        if (thr.falling !== null && slope <= thr.falling) {
            deteriorating = true;
            alerts.push(`${fmt(key)} falling (slope ${slope.toFixed(2)}/reading, R²=${r2.toFixed(2)})`);
        }
    }

    return { deteriorating, alerts, deltas, regressions };
}

function fmt(key) {
    return {
        heart_rate:       'Heart rate',
        spo2:             'SpO₂',
        systolic_bp:      'Blood pressure',
        respiratory_rate: 'Respiratory rate',
        temperature:      'Temperature',
    }[key] || key;
}

module.exports = { detectTrend };
