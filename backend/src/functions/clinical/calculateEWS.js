'use strict';

function calculateEWS({ heart_rate, systolic_bp, spo2, temperature, respiratory_rate }) {
    let score = 0;

    if (heart_rate <= 40 || heart_rate >= 131) score += 3;
    else if (heart_rate >= 111 && heart_rate <= 130) score += 2;
    else if ((heart_rate >= 41 && heart_rate <= 50) || (heart_rate >= 91 && heart_rate <= 110)) score += 1;

    if (systolic_bp <= 90 || systolic_bp >= 220) score += 3;
    else if (systolic_bp >= 91 && systolic_bp <= 100) score += 2;
    else if (systolic_bp >= 101 && systolic_bp <= 110) score += 1;

    if (spo2 <= 91) score += 3;
    else if (spo2 >= 92 && spo2 <= 93) score += 2;
    else if (spo2 >= 94 && spo2 <= 95) score += 1;

    if (temperature <= 35.0) score += 3;
    else if (temperature >= 39.1) score += 2;
    else if ((temperature >= 35.1 && temperature <= 36.0) || (temperature >= 38.1 && temperature <= 39.0)) score += 1;

    if (respiratory_rate <= 8 || respiratory_rate >= 25) score += 3;
    else if (respiratory_rate >= 21 && respiratory_rate <= 24) score += 2;
    else if (respiratory_rate >= 9 && respiratory_rate <= 11) score += 1;

    let category = 'stable';
    if (score >= 7) category = 'urgent';
    else if (score >= 5) category = 'high';
    else if (score >= 3) category = 'medium';

    return { total_score: score, category };
}

module.exports = { calculateEWS };
