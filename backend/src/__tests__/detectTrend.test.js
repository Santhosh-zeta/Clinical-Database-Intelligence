'use strict';

const { detectTrend } = require('../functions/clinical/detectTrend');

function makeRows(hrValues, spo2Values) {
    return hrValues.map((hr, i) => ({
        heart_rate: hr,
        spo2: spo2Values ? spo2Values[i] : 98,
        systolic_bp: 120,
        respiratory_rate: 15,
        temperature: 37.0,
    }));
}

describe('detectTrend (linear regression)', () => {
    test('flat vitals → not deteriorating', () => {
        const rows = makeRows([75, 75, 76, 74, 75, 75, 76, 74, 75, 75]);
        const { deteriorating } = detectTrend(rows);
        expect(deteriorating).toBe(false);
    });

    test('steeply rising HR → deteriorating', () => {
        const rows = makeRows([60, 65, 70, 75, 80, 85, 90, 95, 100, 105]);
        const { deteriorating, alerts } = detectTrend(rows);
        expect(deteriorating).toBe(true);
        expect(alerts.some(a => a.toLowerCase().includes('heart rate'))).toBe(true);
    });

    test('steeply falling SpO2 → deteriorating', () => {
        const rows = makeRows(
            [75, 75, 75, 75, 75, 75, 75, 75, 75, 75],
            [98, 97.5, 97, 96.5, 96, 95.5, 95, 94.5, 94, 93.5]
        );
        const { deteriorating } = detectTrend(rows);
        expect(deteriorating).toBe(true);
    });

    test('fewer than 3 readings → not deteriorating', () => {
        const rows = makeRows([75, 80]);
        const { deteriorating } = detectTrend(rows);
        expect(deteriorating).toBe(false);
    });

    test('noisy data without clear trend → not flagged', () => {
        const rows = makeRows([75, 82, 71, 80, 74, 79, 72, 81, 75, 78]);
        const { deteriorating } = detectTrend(rows);
        expect(deteriorating).toBe(false);
    });

    test('returns regressions object with slope and r2', () => {
        const rows = makeRows([60, 65, 70, 75, 80, 85, 90, 95, 100, 105]);
        const { regressions } = detectTrend(rows);
        expect(regressions).toHaveProperty('heart_rate');
        expect(typeof regressions.heart_rate.slope).toBe('number');
        expect(typeof regressions.heart_rate.r2).toBe('number');
    });
});
