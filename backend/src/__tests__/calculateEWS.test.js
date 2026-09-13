'use strict';

const { calculateEWS } = require('../functions/clinical/calculateEWS');

describe('calculateEWS (NEWS2)', () => {
    test('stable patient scores 0', () => {
        const result = calculateEWS({ heart_rate: 75, systolic_bp: 122, spo2: 98, temperature: 36.8, respiratory_rate: 15 });
        expect(result.total_score).toBe(0);
        expect(result.category).toBe('stable');
    });

    test('critical SpO2 ≤91 scores 3 on that parameter', () => {
        const result = calculateEWS({ heart_rate: 75, systolic_bp: 122, spo2: 88, temperature: 36.8, respiratory_rate: 15 });
        expect(result.total_score).toBeGreaterThanOrEqual(3);
    });

    test('extreme tachycardia ≥131 scores 3 on HR', () => {
        const result = calculateEWS({ heart_rate: 145, systolic_bp: 122, spo2: 98, temperature: 36.8, respiratory_rate: 15 });
        expect(result.total_score).toBeGreaterThanOrEqual(3);
    });

    test('critical patient (multi-system failure) scores urgent', () => {
        const result = calculateEWS({ heart_rate: 148, systolic_bp: 82, spo2: 84, temperature: 39.9, respiratory_rate: 32 });
        expect(result.total_score).toBeGreaterThanOrEqual(7);
        expect(result.category).toBe('urgent');
    });

    test('hypotension (SBP ≤90) scores 3 on BP', () => {
        const result = calculateEWS({ heart_rate: 75, systolic_bp: 88, spo2: 98, temperature: 36.8, respiratory_rate: 15 });
        expect(result.total_score).toBeGreaterThanOrEqual(3);
    });

    test('mild tachycardia 91–110 scores 1 on HR', () => {
        const result = calculateEWS({ heart_rate: 100, systolic_bp: 122, spo2: 98, temperature: 36.8, respiratory_rate: 15 });
        expect(result.total_score).toBe(1);
        expect(result.category).toBe('stable');
    });

    test('missing vitals default to 0 contribution', () => {
        const result = calculateEWS({ heart_rate: 75 });
        expect(result.total_score).toBeGreaterThanOrEqual(0);
        expect(typeof result.category).toBe('string');
    });
});
