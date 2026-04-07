# Clinical Database Intelligence - Backend

This is the core intelligence engine of the platform. It follows a **Database-Centric** architecture where clinical algorithms, data integrity rules, and administrative procedures reside directly within PostgreSQL/TimescaleDB.

## 🏗️ Architecture: The Three Layers

| Layer | Responsibility | Implementation |
| :--- | :--- | :--- |
| **Transport** | API Interface & Auth | `src/controllers/`, `src/routes/` |
| **Orchestration** | Service Bridging | `src/services/` (Thin wrappers) |
| **Intelligence** | **The Clinical Brain** | `src/db/functions/`, `src/db/migrations/` |

---

## 📂 Project Structure & File Definitions

### 🚀 Core
- **`src/server.js`**: Application entry point. Configures Express, Middleware, and Routes.
- **`src/config/db.js`**: Database connection pool configuration (PostgreSQL/TimescaleDB).
- **`.env`**: Environment variables (Database URLs, JWT Secrets, Ports).

### 🧠 Database Intelligence (`src/db/`)
- **`migrate.js`**: Idempotent migration runner that tracks applied scripts in `schema_migrations`.
- **`migrations/`**: 27 SQL files defining the Relational/Timeseries schema and static clinical data.
    - *Key Files*: `026_clinical_intelligence_procs.sql` (Proc for Admissions), `027_trend_trigger.sql` (Proactive Trend Detection).
- **`functions/`**: 10 SQL files containing the **Core Intelligence** (PL/pgSQL).
    - `001_risk_score_procedure`: Calculates overall patient mortality risk.
    - `007_ews_trigger`: Implements the NEWS2 (Early Warning Score) standard.
    - `003_icu_escalation`: Logic for smart ICU bed allocation.

### 🛂 Orchestration & Transport
- **`src/controllers/`**: 10 Handlers mapping HTTP requests to Service calls.
    - `auth.controller.js`: JWT handles and mock login mapping.
    - `vitals.controller.js`: Ingestion point for telemetry.
- **`src/services/`**: 11 Thin services that coordinate DB queries.
    - `patient.service.js`: Aggregates the complex "Clinical Timeline".
    - `vitals.service.js`: Forwards vitals to the DB for trigger-based processing.
- **`src/routes/`**: API endpoint definitions (RESTful).
- **`src/middleware/`**:
    - `auth.js`: JWT token verification.
    - `rbac.js`: Role-Based Access Control (Doctor, Nurse, Admin, Patient).
    - `tenancy.js`: Organization-level data isolation.
    - `errorHandler.js`: Standardized API error responses.

### 🛠️ Utilities & Scripts
- **`scripts/test_db_intelligence.js`**: Verification suite for SQL-based clinical logic.

---

## 🏥 Intelligence Features (SQL-Driven)
Every vital sign recorded triggers a chain of events in the database:
1.  **NEWS2 Scoring**: Automatically calculates and persists the Early Warning Score.
2.  **Trend Detection**: Compares latest readings to historical trends to find rapid deterioration.
3.  **Proactive Alerting**: Generates `alerts` and `notifications` if thresholds are breached.
4.  **Audit Logging**: Every clinical change is captured in `audit_logs` via DB triggers.

## 🚀 Running the Backend
1.  `npm install` - Install dependencies.
2.  `npm run migrate` - Apply all schema and clinical functions.
3.  `npm run dev` - Start the development server with hot-reload.
4.  `node scripts/test_db_intelligence.js` - Verify the clinical intelligence tier.
