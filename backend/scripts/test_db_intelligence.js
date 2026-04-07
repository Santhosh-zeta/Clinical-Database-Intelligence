'use strict';

const db = require('../src/config/db');

async function testClinicalIntelligence() {
    console.log('--- Testing Clinical Database Intelligence Tier ---');
    try {
        // 1. Test pro_admit_patient
        console.log('\n[1/3] Testing pro_admit_patient procedure...');
        try {
            await db.query('CALL pro_admit_patient($1, $2, $3, $4, $5, $6, $7, $8)',
                [1, 1, 1, 1, 'Test Admission', 'Notes', 1, null]);
            console.log('✅ Admission procedure executed (expect success or dup-prevented)');
        } catch (e) {
            if (e.message.includes('already has an active admission')) {
                console.log('✅ Admission procedure correctly prevented duplicate (Integrity Check passed)');
            } else {
                console.error('❌ Admission procedure failed unexpectedly:', e.message);
            }
        }

        // 2. Test fn_detect_trend
        console.log('\n[2/3] Testing fn_detect_trend intelligence function...');
        // Insert some dummy vitals for admission #1
        const aid = 1;
        await db.query(`INSERT INTO vitals (admission_id, heart_rate, systolic_bp, spo2, respiratory_rate, recorded_by) VALUES
            ($1, 80, 120, 98, 16, 1),
            ($1, 90, 110, 97, 18, 1),
            ($1, 100, 100, 96, 20, 1),
            ($1, 115, 90, 94, 24, 1),
            ($1, 135, 80, 90, 28, 1)`, [aid]);

        const trendRes = await db.query('SELECT * FROM fn_detect_trend($1)', [aid]);
        const trend = trendRes.rows[0];
        console.log('Trend Results:', trend);
        if (trend.deteriorating) {
            console.log('✅ SQL Intelligence successfully detected clinical deterioration!');
            console.log('Alerts:', trend.alerts);
        } else {
            console.log('❌ SQL Intelligence failed to detect trend.');
        }

        // 3. Verify trigger integration
        console.log('\n[3/3] Verifying trigger chain (Alerts + Timeline)...');
        const alerts = await db.query(
            `SELECT * FROM alerts WHERE admission_id = $1 AND alert_type = 'TREND_ALERT' ORDER BY triggered_at DESC LIMIT 1`,
            [aid]
        );
        if (alerts.rowCount > 0) {
            console.log('✅ Trigger Chain Success: Trend Alert automatically created by DB trigger!');
            console.log('Message:', alerts.rows[0].message);
        } else {
            console.log('❌ Trigger Chain Failed: No alert found in database.');
        }

        const events = await db.query(
            `SELECT * FROM patient_events WHERE event_type = 'alert' AND description ILIKE '%Trend%' ORDER BY created_at DESC LIMIT 1`
        );
        if (events.rowCount > 0) {
            console.log('✅ Clinical Timeline Success: Event automatically logged in patient history.');
        } else {
            console.log('❌ Clinical Timeline Failed: No event logged.');
        }

    } catch (err) {
        console.error('FATAL ERROR during verification:', err);
    } finally {
        console.log('\n--- Verification Complete ---');
        process.exit(0);
    }
}

testClinicalIntelligence();
