'use strict';

/**
 * simulate.js — Real-time vitals simulator.
 *
 * Simulates 3 patient profiles every N seconds:
 *   - STABLE    → normal vitals (score 0-2, no alerts)
 *   - MODERATE  → slightly off (score 3-4, yellow alert)
 *   - CRITICAL  → severely abnormal (score 7-10, red alert + ICU escalation)
 *
 * Usage:
 *   node simulate.js [admission_ids...]
 *   e.g.  node simulate.js 1 2 3
 *
 * If no IDs are passed, it tries to fetch active admissions from the API.
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const API = process.env.API_URL || 'http://localhost:3001';
const INTERVAL = parseInt(process.env.VITALS_INTERVAL_MS || '5000', 10);
const api = axios.create({ baseURL: API, timeout: 8000 });

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Login to the backend to get a JWT token.
 * Uses a mock account since the backend has dev fallback.
 */
async function login() {
    try {
        const res = await api.post('/api/auth/login', {
            email: 'a1@intellicare.demo',
            password: 'password123'
        });
        const token = res.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return token;
    } catch (err) {
        console.error(chalk.red(' ✗ Authentication failed:'), err.response?.data?.error || err.message);
        process.exit(1);
    }
}


// ── Patient Profiles ─────────────────────────────────────────────────────────

/**
 * Generate a vitals reading for a given clinical state.
 * Adds realistic noise using Gaussian-like jitter.
 */
function jitter(base, range) {
    return Math.round(base + (Math.random() * range * 2 - range));
}
function jitterF(base, range, decimals = 1) {
    return parseFloat((base + (Math.random() * range * 2 - range)).toFixed(decimals));
}

const PROFILES = {
    stable: () => ({
        heart_rate: jitter(75, 5),
        systolic_bp: jitter(120, 8),
        diastolic_bp: jitter(80, 5),
        spo2: jitterF(98, 1, 1),
        temperature: jitterF(36.8, 0.2),
        respiratory_rate: jitter(15, 2),
        blood_glucose: jitterF(95, 5, 1),
    }),

    moderate: () => ({
        heart_rate: jitter(108, 8),          // mild tachycardia
        systolic_bp: jitter(148, 10),          // mild hypertension
        diastolic_bp: jitter(92, 5),
        spo2: jitterF(92, 1.5, 1),      // mild hypoxia
        temperature: jitterF(38.4, 0.3),       // low-grade fever
        respiratory_rate: jitter(22, 3),
        blood_glucose: jitterF(160, 10, 1),
    }),

    critical: () => ({
        heart_rate: jitter(148, 10),          // severe tachycardia
        systolic_bp: jitter(186, 8),           // hypertensive crisis
        diastolic_bp: jitter(110, 5),
        spo2: jitterF(84, 2, 1),        // critical hypoxia → triggers ICU
        temperature: jitterF(39.9, 0.3),       // high fever
        respiratory_rate: jitter(32, 4),
        blood_glucose: jitterF(280, 20, 1),
    }),

    recovering: () => ({
        heart_rate: jitter(82, 4),
        systolic_bp: jitter(128, 6),
        diastolic_bp: jitter(82, 4),
        spo2: jitterF(97, 0.5, 1),
        temperature: jitterF(37.1, 0.2),
        respiratory_rate: jitter(16, 2),
        blood_glucose: jitterF(102, 8, 1),
    }),
};

// ── Color Helpers ─────────────────────────────────────────────────────────────

function colorScore(score) {
    if (score >= 8) return chalk.bgRed.white.bold(` CRITICAL [${score}] `);
    if (score >= 5) return chalk.bgYellow.black.bold(` HIGH [${score}] `);
    if (score >= 3) return chalk.yellow(` MODERATE [${score}]`);
    return chalk.green(` STABLE [${score}]`);
}

function colorVital(label, value, unit, low, high) {
    const isAbnormal = value < low || value > high;
    const str = `${label}: ${value}${unit}`;
    return isAbnormal ? chalk.red(str) : chalk.gray(str);
}

// ── API Calls ─────────────────────────────────────────────────────────────────

async function postVitals(admissionId, vitals) {
    const res = await api.post('/api/vitals', { admission_id: admissionId, ...vitals });
    return res.data;
}

async function getActiveAdmissions() {
    const res = await api.get('/api/admissions?status=active');
    return res.data.rows || res.data.data || [];
}

async function getAlerts() {
    const res = await api.get('/api/alerts?limit=5');
    return res.data.data || [];
}

async function getDashboardStats() {
    const res = await api.get('/api/dashboard/stats');
    return res.data.data || {};
}

// ── Render Dashboard ──────────────────────────────────────────────────────────

function clearScreen() {
    process.stdout.write('\x1Bc');
}

async function renderStats() {
    try {
        const stats = await getDashboardStats();
        const alerts = await getAlerts();

        console.log(chalk.bold.blue('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.blue('│      🏥  CLINICAL INTELLIGENCE DASHBOARD         │'));
        console.log(chalk.bold.blue('└─────────────────────────────────────────────────┘'));
        console.log();
        console.log(
            chalk.white(' Active Admissions:'), chalk.cyan(stats.active_admissions || '?'),
            '  |  ',
            chalk.white('Total Patients:'), chalk.cyan(stats.total_patients || '?'),
            '  |  ',
            chalk.white('Active Doctors:'), chalk.cyan(stats.active_doctors || '?')
        );
        console.log(
            chalk.white(' Unacked Alerts:'), chalk.yellow(stats.unacknowledged_alerts || '0'),
            '  |  ',
            chalk.red('Critical Alerts:'), chalk.red.bold(stats.critical_alerts || '0'),
            '  |  ',
            chalk.white('ICU Available:'), chalk.green(stats.available_icu_beds || '?') + '/' + chalk.gray(stats.total_icu_beds || '?')
        );
        console.log(
            chalk.white(' Risk — Critical:'), chalk.red(stats.critical_patients || '0'),
            ' High:', chalk.yellow(stats.high_risk_patients || '0'),
            ' Stable:', chalk.green(stats.stable_patients || '0')
        );

        console.log();
        if (alerts.length > 0) {
            console.log(chalk.bold(' 🚨 Latest Unacknowledged Alerts:'));
            for (const a of alerts.slice(0, 4)) {
                const icon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡';
                console.log(`  ${icon} [${a.severity.toUpperCase()}] ${a.message} — Patient: ${a.patient_name || 'N/A'}`);
            }
        } else {
            console.log(chalk.green(' ✅ No unacknowledged alerts'));
        }
        console.log();
    } catch {
        // Stats not critical to simulation
    }
}

// ── Main Loop ─────────────────────────────────────────────────────────────────

async function simulate(admissionIds) {
    if (admissionIds.length === 0) {
        console.log(chalk.cyan(' Fetching active admissions from API...'));
        const admissions = await getActiveAdmissions();
        if (admissions.length === 0) {
            console.log(chalk.red(' No active admissions found. Run `node seed.js` first,'));
            console.log(chalk.red(' then admit patients via POST /api/admissions.\n'));
            process.exit(1);
        }
        admissions.forEach((a) => admissionIds.push(a.id));
        console.log(chalk.green(` Found ${admissionIds.length} active admission(s): ${admissionIds.join(', ')}\n`));
    }

    // Assign each admission a cycling profile
    const profileNames = ['stable', 'moderate', 'critical', 'recovering'];
    const assignments = admissionIds.map((id, i) => ({
        admissionId: id,
        profileIndex: i % profileNames.length,
        cycle: 0,
    }));

    // Profile rotation: each patient shifts profile every ~5 cycles to simulate real changes
    const ROTATION_EVERY = 5;

    let tick = 0;

    const run = async () => {
        clearScreen();
        console.log(chalk.bold.gray(`  Tick #${++tick}  |  Interval: ${INTERVAL}ms  |  ${new Date().toLocaleTimeString()}\n`));

        await renderStats();

        console.log(chalk.bold(' 📡 Posting Vitals This Tick:'));

        for (const asgn of assignments) {
            const profileName = profileNames[asgn.profileIndex];
            const vitals = PROFILES[profileName]();

            try {
                await postVitals(asgn.admissionId, vitals);

                const score = estimateScore(vitals);
                console.log(
                    ` Admission #${asgn.admissionId}`,
                    chalk.gray(`[${profileName}]`),
                    colorScore(score),
                    '\n  ',
                    colorVital('HR', vitals.heart_rate, ' bpm', 60, 100),
                    colorVital('BP', vitals.systolic_bp, ' mmHg', 90, 140),
                    colorVital('SpO2', vitals.spo2, '%', 95, 100),
                    colorVital('Temp', vitals.temperature, '°C', 36, 38),
                );
            } catch (e) {
                console.log(` Admission #${asgn.admissionId}`, chalk.red('✗ Failed:'), e.response?.data?.error || e.message);
            }

            // Rotate profile every N cycles
            asgn.cycle++;
            if (asgn.cycle >= ROTATION_EVERY) {
                asgn.cycle = 0;
                asgn.profileIndex = (asgn.profileIndex + 1) % profileNames.length;
            }
        }

        console.log(chalk.gray(`\n  Next update in ${INTERVAL / 1000}s... (Ctrl+C to stop)\n`));
    };

    // Run immediately, then on interval
    await run();
    setInterval(run, INTERVAL);
}

/**
 * Local score estimator (mirrors DB logic) for display only.
 * The actual score is computed in the DB trigger.
 */
function estimateScore(v) {
    let s = 0;
    if (v.heart_rate) s += v.heart_rate < 40 || v.heart_rate > 140 ? 3 : v.heart_rate < 50 || v.heart_rate > 120 ? 2 : v.heart_rate < 60 || v.heart_rate > 100 ? 1 : 0;
    if (v.systolic_bp) s += v.systolic_bp < 70 || v.systolic_bp > 180 ? 3 : v.systolic_bp < 80 || v.systolic_bp > 160 ? 2 : v.systolic_bp < 90 || v.systolic_bp > 140 ? 1 : 0;
    if (v.spo2) s += v.spo2 < 85 ? 3 : v.spo2 < 90 ? 2 : v.spo2 < 95 ? 1 : 0;
    if (v.temperature) s += v.temperature < 34 || v.temperature > 40 ? 3 : v.temperature < 35 || v.temperature > 39 ? 2 : v.temperature < 36 || v.temperature > 38 ? 1 : 0;
    return Math.min(s, 10);
}

// ── Entry Point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2).map(Number).filter(Boolean);

console.log(chalk.bold.blue('\n🏥  Clinical Intelligence System — Vitals Simulator\n'));
api.get('/health')
    .then(async () => {
        console.log(chalk.green(' ✓ API reachable'));
        await login();
        console.log(chalk.green(' ✓ Authenticated successfully'));
        simulate(args);
    })
    .catch(() => {
        console.log(chalk.red(` ✗ Cannot reach API at ${API}`));
        console.log(chalk.gray('   Make sure the backend is running: npm run dev\n'));
        process.exit(1);
    });
