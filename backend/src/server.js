'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────────────────────
const patientRoutes = require('./routes/patients');
const admissionRoutes = require('./routes/admissions');
const vitalsRoutes = require('./routes/vitals');
const alertRoutes = require('./routes/alerts');
const notificationRoutes = require('./routes/notifications');
const bedRoutes = require('./routes/beds');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const doctorRoutes = require('./routes/doctors');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/icu', bedRoutes);        // ICU queries share the beds router
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error Handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Server] Clinical Intelligence API running on http://localhost:${PORT}`);
});

module.exports = app;
