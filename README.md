# IntelliCare: Clinical Database Intelligence Platform

A full-stack, real-time hospital management and clinical intelligence command center. This system seamlessly integrates a robust **relational database** with a high-frequency **time-series database**, enabling continuous patient vitals tracking, dynamic risk scoring, ICU escalation automation, and real-time medical alerting.

---

## 🚀 Key Features

* **Role-Based Access Control (RBAC)**: Secure, role-specific views and permissions tailored for System Admins, Doctors, Nurses, and Patients.
* **Modern Minimalist UI**: A clean, professional, and responsive Next.js frontend built with Tailwind CSS, focusing on clinical legibility and frictionless UX.
* **Real-Time Data Streaming**: Websocket-driven pipelines (Socket.io) that instantly reflect new telemetry data on live dashboard graphs without page reloads.
* **Intelligent Alerting System**: Early Warning Scores (EWS) are calculated dynamically, pushing critical alerts immediately to staff when patient vitals cross safe thresholds.
* **ICU & Ward Management**: Comprehensive digital twin of the hospital structure for easy bed assignments, patient tracking, and ward overviews.
* **Clinical Workflows**: Integrated modules for daily rounds, shift handovers, medication administration, and discharge authorization.
* **Hardware Telemetry Simulation**: Built-in NodeJS simulator that mimics continuous IoT biometric hardware sensors under heavy time-series loads.

---

## 🏛️ System Architecture

1. **Database** (`Docker: timescale/timescaledb:latest-pg16`): The central single-source-of-truth. Marries standard patient records (PostgreSQL) with high-frequency continuous aggregates (TimescaleDB) for vitals vectors.
2. **Backend API** (`backend/`): Node.js/Express service responsible for authentication, complex business logic, prescription validation, and API REST routing.
3. **Frontend Application** (`frontend/`): React (Next.js App Router) web application utilizing Tailwind CSS. Automatically syncs via Websockets to present analytical dashboards with Recharts.
4. **Clinical Simulator** (`simulator/`): A headless continuous data generator pushing stochastic biometric variables directly to the backend to mimic real-world medical hardware.

---

## 👥 Roles & Usage

The platform provides dedicated modules based on the logged-in user's role:

* **Admins**: Full overview of the hospital system. Can manage staff members, oversee all patient records, configure system settings, and view high-level analytics.
* **Doctors**: Focused on clinical decision-making. Can view detailed patient histories, prescribe medications, authorize discharges, and manage specialist consults.
* **Nurses**: Focused on bedside care. Access to shift handovers, medication administration rounds, vital signs monitoring, and immediate alerting.
* **Patients**: Personal care portal. Can view their own vital history, upcoming appointments, billing details, and medication schedules.

---

## ⚙️ Prerequisites

Ensure your system has the following dependencies installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Compose (for the database)
* [Node.js](https://nodejs.org/) (Version 18 or higher)
* [Git](https://git-scm.com/)

---

## 🛠️ Quickstart Setup Guide

Follow these sequential steps to bootstrap the entire development environment securely.

### 1. Boot up the Database (Docker)
Ensure Docker is running locally. The database will bind to port `5433`.
```bash
# In the root project directory:
docker compose up -d
```
> *Wait sequence: Give the database 15-20 seconds to fully initialize its internal PostgreSQL/TimescaleDB extensions.*

### 2. Initialize the Backend Service
Setup your backend dependencies, run relational migrations, and start the local API server.
```bash
cd backend
npm install
npm run migrate   # Generates RBAC, Tenancy, Triggers, & Roles
npm run dev       # Starts API on http://localhost:3001
```

### 3. Initialize the Frontend Application
In a **new terminal tab**, spin up the Next.js development server.
```bash
cd frontend
npm install
npm run dev       # Starts UI on http://localhost:3000
```

### 4. Setup Default Staff & Data Simulation
To see the system "thinking" and displaying active patient profiles, we must seed the tables and start the live simulator. Open a **third terminal**:
```bash
cd simulator
npm install
node setup_db.js       # 1. Establish basic structural hierarchy (Wards, Beds, Test Staff)
node seed.js           # 2. Register dummy patients into the system
node admit_patients.js # 3. Formally admit patients into available ICU/General beds
node simulate.js       # 4. Initiate continuous medical hardware telemetry
```
> *The `simulate.js` process will remain running endlessly, POSTing stochastic heart rates and vital signs over the REST APIs to mimic living patients.*

---

## 💻 Working on the Project 

### Log In to the Dashboard
Navigate to [**http://localhost:3000**](http://localhost:3000)

Your root administrative clinical login operates on global defaults matching the simulator context:
* **Email:** `a1@intellicare.demo`
* **Password:** `password123`

The login page also provides a simple quick-select menu to simulate logins as a Doctor, Nurse, or Patient.

### Development Workflow
* **Frontend Hot-Reloading:** Next.js natively updates styling and logic the moment you save a file in `frontend/src/*`.
* **Backend Nodemon:** The backend utilizes `nodemon`, so modifying `backend/src/*` will automatically restart the Express API routes.
* **Monitoring Telemetry:** If you wish to halt live graphs temporarily or test zero-load behavior, simply kill the process running `node simulate.js`. The dashboard will immediately reflect the paused hardware state gracefully.

---
*Built to tightly integrate Medical IoT scaling constraints and enterprise capabilities natively.*