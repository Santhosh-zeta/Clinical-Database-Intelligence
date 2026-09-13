'use strict';

/**
 * IntelliCare Clinical Simulator — Markov-chain patient state machine.
 *
 * Each patient has:
 *   - A current physiological STATE (stable/moderate/critical/recovering)
 *   - BASELINE vitals drawn from a per-patient gaussian distribution
 *   - TEMPORAL CORRELATION: each vital drifts from the previous reading
 *   - STATE TRANSITIONS driven by a Markov matrix with per-state probabilities
 *   - NOISE: occasional sensor artefact (brief spike / dropoff)
 *
 * This produces temporally-correlated, patient-specific, physiologically plausible
 * telemetry — not independent random samples.
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const API      = process.env.API_URL || 'http://localhost:3001';
const INTERVAL = parseInt(process.env.VITALS_INTERVAL_MS || '5000', 10);
const api      = axios.create({ baseURL: API, timeout: 8000 });

// ─── Markov transition matrix ─────────────────────────────────────────────────
//  From state  →  [stable, moderate, critical, recovering]
const TRANSITIONS = {
    stable:     [0.85,  0.10,  0.02,  0.03],
    moderate:   [0.10,  0.68,  0.15,  0.07],
    critical:   [0.02,  0.20,  0.65,  0.13],
    recovering: [0.25,  0.05,  0.01,  0.69],
};
const STATE_NAMES = ['stable', 'moderate', 'critical', 'recovering'];

// ─── Physiological target vitals per state ────────────────────────────────────
const STATE_TARGETS = {
    stable:     { hr: 75,  sbp: 122, dbp: 80, spo2: 98.0, temp: 36.8, rr: 15, bg: 95  },
    moderate:   { hr: 108, sbp: 148, dbp: 92, spo2: 92.5, temp: 38.4, rr: 22, bg: 160 },
    critical:   { hr: 148, sbp: 186, dbp: 110,spo2: 84.0, temp: 39.9, rr: 32, bg: 280 },
    recovering: { hr: 82,  sbp: 128, dbp: 82, spo2: 97.0, temp: 37.1, rr: 16, bg: 102 },
};

// ─── Per-vital noise sigma per state (realistic variability) ──────────────────
const STATE_SIGMA = {
    stable:     { hr: 4,   sbp: 6,  dbp: 4, spo2: 0.5, temp: 0.15, rr: 1.5, bg: 5   },
    moderate:   { hr: 8,   sbp: 10, dbp: 5, spo2: 1.5, temp: 0.30, rr: 3.0, bg: 12  },
    critical:   { hr: 12,  sbp: 8,  dbp: 6, spo2: 2.5, temp: 0.35, rr: 4.0, bg: 25  },
    recovering: { hr: 4,   sbp: 5,  dbp: 4, spo2: 0.5, temp: 0.20, rr: 2.0, bg: 8   },
};

// ─── Temporal smoothing factor α ∈ (0,1)  ─────────────────────────────────────
// New reading = α * target + (1-α) * previous + noise
// Lower α = slower drift toward target (more inertia)
const ALPHA = 0.15;

// ─── Sensor artefact probability per reading ──────────────────────────────────
const ARTEFACT_PROB = 0.03;

// ─── Gaussian random number (Box-Muller) ─────────────────────────────────────
function gauss(mean, sigma) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }
function pick(mean, sigma)   { return parseFloat(gauss(mean, sigma).toFixed(1)); }
function pickInt(mean, sigma){ return Math.round(gauss(mean, sigma)); }

// ─── Patient state object ─────────────────────────────────────────────────────
function createPatientState(admissionId, initialState = 'stable') {
    const tgt = STATE_TARGETS[initialState];
    return {
        admissionId,
        state:   initialState,
        current: {
            hr:   tgt.hr,
            sbp:  tgt.sbp,
            dbp:  tgt.dbp,
            spo2: tgt.spo2,
            temp: tgt.temp,
            rr:   tgt.rr,
            bg:   tgt.bg,
        },
        artefactActive: false,
    };
}

// ─── Markov transition ────────────────────────────────────────────────────────
function nextState(current) {
    const probs = TRANSITIONS[current];
    let r = Math.random();
    for (let i = 0; i < STATE_NAMES.length; i++) {
        r -= probs[i];
        if (r <= 0) return STATE_NAMES[i];
    }
    return STATE_NAMES[STATE_NAMES.length - 1];
}

// ─── Generate next vital reading ──────────────────────────────────────────────
function nextVitals(patient) {
    // Possibly transition to a new clinical state
    patient.state = nextState(patient.state);

    const tgt = STATE_TARGETS[patient.state];
    const sig = STATE_SIGMA[patient.state];
    const cur = patient.current;

    // Simulate occasional sensor artefact
    const isArtefact = Math.random() < ARTEFACT_PROB;

    function drift(key, lo, hi, intVal = true) {
        let next = ALPHA * tgt[key] + (1 - ALPHA) * cur[key] + gauss(0, sig[key]);
        if (isArtefact) next += (Math.random() > 0.5 ? 1 : -1) * sig[key] * 4;
        next = clamp(next, lo, hi);
        cur[key] = next;
        return intVal ? Math.round(next) : parseFloat(next.toFixed(1));
    }

    const hr   = drift('hr',   20,  220, true);
    const sbp  = drift('sbp',  60,  250, true);
    const dbp  = drift('dbp',  40,  140, true);
    const spo2 = drift('spo2', 70,  100, false);
    const temp = drift('temp', 34,  42,  false);
    const rr   = drift('rr',   4,   50,  true);
    const bg   = drift('bg',   40,  500, false);

    patient.artefactActive = isArtefact;

    return { heart_rate: hr, systolic_bp: sbp, diastolic_bp: dbp, spo2, temperature: temp, respiratory_rate: rr, blood_glucose: bg };
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function login() {
    const res = await api.post('/api/auth/login', { email: 'a1@intellicare.demo', password: process.env.DEMO_PASSWORD || 'password123' });
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
}

async function getActiveAdmissions() {
    const res = await api.get('/api/admissions?status=active');
    return res.data.rows || [];
}

async function postVitals(admissionId, vitals) {
    const res = await api.post('/api/vitals', { admission_id: admissionId, ...vitals });
    return res.data;
}

async function getDashboardStats() {
    const res = await api.get('/api/admin/dashboard');
    return res.data.data || {};
}

async function getAlerts() {
    const res = await api.get('/api/alerts?limit=5');
    return res.data.rows || [];
}

// ─── EWS estimate (mirrors DB logic) ─────────────────────────────────────────
function estimateEWS(v) {
    let s = 0;
    if (v.heart_rate !== undefined)       s += v.heart_rate <= 40 || v.heart_rate >= 131 ? 3 : v.heart_rate >= 111 ? 2 : (v.heart_rate <= 50 || v.heart_rate >= 91) ? 1 : 0;
    if (v.systolic_bp !== undefined)      s += v.systolic_bp <= 90 || v.systolic_bp >= 220 ? 3 : v.systolic_bp <= 100 ? 2 : v.systolic_bp <= 110 ? 1 : 0;
    if (v.spo2 !== undefined)             s += v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0;
    if (v.temperature !== undefined)      s += v.temperature <= 35 ? 3 : v.temperature >= 39.1 ? 2 : (v.temperature <= 36 || v.temperature >= 38.1) ? 1 : 0;
    if (v.respiratory_rate !== undefined) s += v.respiratory_rate <= 8 || v.respiratory_rate >= 25 ? 3 : v.respiratory_rate >= 21 ? 2 : v.respiratory_rate <= 11 ? 1 : 0;
    return Math.min(s, 20);
}

function colorScore(score) {
    if (score >= 7) return chalk.bgRed.white.bold(` URGENT [${score}] `);
    if (score >= 5) return chalk.bgYellow.black.bold(` HIGH [${score}] `);
    if (score >= 3) return chalk.yellow(` MODERATE [${score}]`);
    return chalk.green(` STABLE [${score}]`);
}

function colorState(state) {
    const map = { stable: chalk.green, moderate: chalk.yellow, critical: chalk.red.bold, recovering: chalk.cyan };
    return (map[state] || chalk.white)(state.toUpperCase());
}

function colorVital(label, value, unit, lo, hi) {
    const str = `${label}: ${value}${unit}`;
    return (value < lo || value > hi) ? chalk.red(str) : chalk.gray(str);
}

// ─── Dashboard rendering ──────────────────────────────────────────────────────
async function renderStats() {
    try {
        const [stats, alerts] = await Promise.all([getDashboardStats(), getAlerts()]);
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
            chalk.red('Critical:'), chalk.red.bold(stats.critical_alerts || '0'),
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
                console.log(`  ${icon} [${a.severity.toUpperCase()}] ${a.message} — ${a.patient_name || 'N/A'}`);
            }
        } else {
            console.log(chalk.green(' ✅ No unacknowledged alerts'));
        }
        console.log();
    } catch (_) {}
}

// ─── Main simulation loop ─────────────────────────────────────────────────────
async function simulate(admissionIds) {
    let admissions = [];
    if (admissionIds.length === 0) {
        console.log(chalk.cyan(' Fetching active admissions from API...'));
        admissions = await getActiveAdmissions();
        if (admissions.length === 0) {
            console.log(chalk.red(' No active admissions found.'));
            console.log(chalk.red(' Run `node seed.js` then admit patients via POST /api/admissions.\n'));
            process.exit(1);
        }
        admissionIds = admissions.map(a => a.id);
        console.log(chalk.green(` Found ${admissionIds.length} active admission(s): ${admissionIds.join(', ')}\n`));
    }

    // Assign each patient an initial state staggered across profiles
    const initialStates = ['stable', 'moderate', 'critical', 'recovering'];
    const patients = admissionIds.map((id, i) => createPatientState(id, initialStates[i % initialStates.length]));

    let tick = 0;
    const run = async () => {
        process.stdout.write('\x1Bc');
        console.log(chalk.bold.gray(`  Tick #${++tick}  |  Interval: ${INTERVAL}ms  |  Patients: ${patients.length}  |  ${new Date().toLocaleTimeString()}\n`));

        await renderStats();

        console.log(chalk.bold(' 📡 Posting Vitals This Tick:'));

        for (const patient of patients) {
            const vitals = nextVitals(patient);
            const ews = estimateEWS(vitals);
            const artefact = patient.artefactActive ? chalk.magenta(' [ARTEFACT]') : '';

            try {
                await postVitals(patient.admissionId, vitals);
                console.log(
                    ` Adm #${patient.admissionId}`,
                    colorState(patient.state),
                    colorScore(ews),
                    artefact,
                    '\n  ',
                    colorVital('HR', vitals.heart_rate, ' bpm', 60, 100),
                    colorVital('BP', vitals.systolic_bp, ' mmHg', 90, 140),
                    colorVital('SpO2', vitals.spo2, '%', 95, 100),
                    colorVital('Temp', vitals.temperature, '°C', 36, 38),
                    colorVital('RR', vitals.respiratory_rate, '/min', 12, 20),
                );
            } catch (e) {
                console.log(` Adm #${patient.admissionId}`, chalk.red('✗'), e.response?.data?.error || e.message);
            }
        }

        console.log(chalk.gray(`\n  Next update in ${INTERVAL / 1000}s... (Ctrl+C to stop)\n`));
    };

    await run();
    setInterval(run, INTERVAL);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2).map(Number).filter(Boolean);
console.log(chalk.bold.blue('\n🏥  IntelliCare Clinical Simulator — Markov Patient State Machine\n'));

api.get('/health')
    .then(async () => {
        console.log(chalk.green(' ✓ API reachable'));
        try {
            await login();
            console.log(chalk.green(' ✓ Authenticated'));
            simulate(args);
        } catch (err) {
            console.error(chalk.red(' ✗ Login failed:'), err.response?.data?.error || err.message);
            process.exit(1);
        }
    })
    .catch(() => {
        console.log(chalk.red(` ✗ Cannot reach API at ${API}`));
        console.log(chalk.gray('   Ensure the backend is running: npm run dev'));
        process.exit(1);
    });
