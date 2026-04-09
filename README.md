# Clinical Database Intelligence Platform


A full-stack, real-time hospital management and clinical intelligence command center. This system seamlessly integrates a robust **relational database** with a high-frequency **time-series database**, enabling continuous patient vitals tracking, dynamic risk scoring, ICU escalation automation, and real-time medical alerting driven by native PostgreSQL database algorithms.

---

##  Key Features

* **Multi-Tenant Clinical Command Center**: A modernized Next.js web application utilizing RBAC (Role-Based Access Control) to securely view real-time patient analytics.
* **Native Database Triggers**: Automated event streaming processing Early Warning Scores (EWS) immediately at the database level when new telemetry hits TimescaleDB.
* **Real-Time Data Streaming**: Socket.io pipelines binding database row triggers to dashboard graphs bridging hardware monitors directly to clinician screens.
* **Complex Telemetry Simulation**: Built-in simulator acting as ICU medical hardware, testing system tolerance under continuous time-series loads.
* **Automated Admission & Ward Logic**: Seamless bed assignments, multi-department analytics, and clinical handovers logic.

---

##  System Architecture

1. **Database** (`Docker: timescale/timescaledb:latest-pg16`): The central single-source-of-truth. Marries patient records (RDBMS) with TimescaleDB continuous aggregates (high-frequency vitals vectors).
2. **Backend API** (`backend/`): Node.js/Express service responsible for authentication, business logic, prescription constraint validation, and API routing.
3. **Frontend Application** (`frontend/`): React (Next.js App Router) utilizing Tailwind CSS. Automatically syncs via Websockets to present beautiful analytical dashboards with Recharts.
4. **Clinical Simulator** (`simulator/`): A headless continuous data generator pushing stochastic biometric variables directly mimicking real-world bed hardware.

---

##  Prerequisites

Ensure your system has the following dependencies installed before initializing the project:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Compose
* [Node.js](https://nodejs.org/) (Version 18 or higher)
* [Git](https://git-scm.com/)

---

##  Quickstart Installation Guide

Follow these sequential steps carefully to bootstrap the entire development environment securely.

### 1. Boot up the Database (Docker)
Ensure Docker is running locally. The database sits on `localhost:5433`.
```bash
# In the root project directory:
docker compose up -d
```
> *Wait sequence: Give the database 15-20 seconds to fully initialize its internal extensions.*

### 2. Initialize the Backend Service
Setup your backend dependencies, run complex relational migrations, and start the local Node server.
```bash
cd backend

# Install all API dependencies
npm install

# Run database migrations (Generates RBAC, Tenancy, Triggers, & Roles)
npm run migrate

# Keep this terminal open: Starts API on http://localhost:3001
npm run dev
```

### 3. Initialize the Frontend Application
In a **new terminal tab**, spin up the Next.js development server.
```bash
cd frontend

# Install all UI dependencies
npm install

# Keep this terminal open: Starts UI on http://localhost:3000
npm run dev
```

### 4. Setup Default Staff & Data Simulation
To see the system "thinking" and displaying active patient profiles, we must seed the tables and start the live simulator. Open a **third terminal**:
```bash
cd simulator

# Install simulator dependencies
npm install

# 1. Establish basic structural hierarchy (Wards, Beds, Test Staff)
node setup_db.js

# 2. Register dummy patients into the system
node seed.js

# 3. Formally admit patients into available ICU/General beds
node admit_patients.js

# 4. Initiate continuous medical hardware telemetry
node simulate.js
```
> *The `simulate.js` process will remain running endlessly, POSTing stochastic heart rates and vital signs every few seconds over the REST APIs to mimic living patients.*

---

## 💻 Working on the Project 

### Log In to the Dashboard
Navigate to [**http://localhost:3000**](http://localhost:3000)

Your root administrative clinical login operates on global defaults matching the simulator context:
* **Email:** `a1@intellicare.demo`
* **Password:** `password123`

### Development Workflow
* **Frontend Hot-Reloading:** The Next.js platform will natively update styling and logic the moment you save a file in `frontend/src/*`.
* **Backend Nodemon:** The backend utilizes `node --watch` (or Nodemon) where modifying `backend/src/*` will automatically restart the Express API routes.
* **Monitoring Telemetry:** If you wish to halt live graphs temporarily or test zero-load behavior, manually kill the process running `node simulate.js`. The dashboard will immediately reflect the paused hardware state gracefully.

##  Documentations
For deep-dive technical explorations referencing exact source patterns, please refer explicitly to:
* [Backend Architecture & Docs](./backend/README.md)
* [Frontend Architecture & Docs](./frontend/README.md)

---
*Built tightly integrating Medical IoT scaling constraints and enterprise Multi-Tenancy capabilities natively.*