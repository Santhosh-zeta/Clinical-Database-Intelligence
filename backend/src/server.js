'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { authenticate } = require('./middleware/auth');
const { tenancy } = require('./middleware/tenancy');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const vitalsRoutes = require('./routes/vitals.routes');
const alertsRoutes = require('./routes/alerts.routes');
const admissionsRoutes = require('./routes/admissions.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard');
const notifRoutes = require('./routes/notifications.routes');
const consultRoutes = require('./routes/consult.routes');
const doctorsRoutes = require('./routes/doctors');
const ambulanceRoutes = require('./routes/ambulance.routes');

const settingsRoutes = require('./routes/settings');
const bedsRoutes = require('./routes/beds');

const http = require('http');
const realtime = require('./services/realtime.service');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
    origin: ['https://intellicare.dropwinggroups.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({
    status: 'ok',
    service: 'Clinical Intelligence API',
    architecture: 'routes → controllers → services → functions → DB',
    timestamp: new Date().toISOString(),
}));

app.use('/api/auth', authRoutes);

const guard = [authenticate, tenancy];

app.use('/api/patients', ...guard, patientRoutes);
app.use('/api/vitals', ...guard, vitalsRoutes);
app.use('/api/alerts', ...guard, alertsRoutes);
app.use('/api/admissions', ...guard, admissionsRoutes);
app.use('/api/prescriptions', ...guard, prescriptionRoutes);
app.use('/api/handovers', ...guard, require('./routes/handover.routes'));
app.use('/api/admin', ...guard, adminRoutes);
app.use('/api/wards', ...guard, require('./routes/wards.routes'));
app.use('/api/medications', ...guard, require('./routes/medication.routes'));
app.use('/api/labs', ...guard, require('./routes/lab.routes'));
app.use('/api/billing', ...guard, require('./routes/billing.routes'));
app.use('/api/appointments', ...guard, require('./routes/appointment.routes'));
app.use('/api/consults', ...guard, require('./routes/consult.routes'));
app.use('/api/symptoms', ...guard, require('./routes/symptoms.routes'));
app.use('/api/doctors', ...guard, doctorsRoutes);
app.use('/api/ambulances', ...guard, ambulanceRoutes);

app.get('/api/dashboard/stats', (req, res) => res.json({ message: 'direct hit' }));
app.use('/api/notifications', ...guard, notifRoutes);

app.use('/api/settings', ...guard, settingsRoutes);
app.use('/api/beds', ...guard, bedsRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use(errorHandler);

realtime.init(server);

server.listen(PORT, () => {
    console.log(`\n[Server] Clinical Intelligence API running on port ${PORT}`);
    console.log(`[Server] Architecture: Express + Socket.io + PG Listeners`);
    console.log(`[Server] Multi-tenancy: org_id from JWT → req.orgId → all queries\n`);
});

module.exports = app;
