# Clinical Intelligence System - Full Setup Guide

This guide describes how to initialize the entire clinical database intelligence platform from scratch using Docker and standard development tools.

## Phase 1: Infrastructure & Database

1. **Bootstrap Infrastructure**:
   Run the root initialization script. This script handles container teardown, networking, database startup, and applying all 37 migrations and 11 procedural functions.
   ```bash
   bash init_docker.sh
   ```

2. **Verify Database Health**:
   Check if the database is responding and the schema is populated.
   ```bash
   docker exec -it clinical-db psql -U postgres -d clinical_db -c "\dt"
   ```

## Phase 2: Backend API

1. **Initialize API**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Verify API Endpoints**:
   Check the health status and public routes.
   - **Health**: `GET http://localhost:3001/health`
   - **Auth**: `POST http://localhost:3001/api/auth/login`

## Phase 3: Frontend Dashboard

1. **Initialize UI**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Access Dashboard**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   - **Default Login**: `a1@intellicare.demo` / `password123`

## Phase 4: Data Simulation

1. **Start Telemetry Loop**:
   To see live data on the dashboard, start the hardware simulator.
   ```bash
   cd simulator
   npm install
   node setup_db.js
   node seed.js
   node admit_patients.js
   node simulate.js
   ```

---

## Complete API Registry (Exposed via Backend)

| Service | Base Route | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Login, Registration, Token Refresh |
| **Patients** | `/api/patients` | Clinical profiles and medical histories |
| **Vitals** | `/api/vitals` | High-frequency telemetry streams |
| **Alerts** | `/api/alerts` | Risk score alarms and acknowledgments |
| **Admissions**| `/api/admissions`| Patient bed assignments and status |
| **Dashboard** | `/api/dashboard` | Aggregated stats for visualization |
| **Real-time** | `WS /socket.io` | Live event broadcasts via Socket.io |
