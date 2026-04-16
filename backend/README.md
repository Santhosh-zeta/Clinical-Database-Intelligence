# Clinical Database Intelligence - Backend Architecture & Documentation

This repository contains the backend infrastructure for the Clinical Database Intelligence System. It provides real-time clinical telemetry processing, database interaction, multi-tenant security mechanisms, and REST API endpoints serving the clinical dashboard.

## System Architecture

The backend utilizes a robust layered Node.js/Express architecture integrating Socket.io for immediate clinical intelligence and PostgreSQL (with TimescaleDB) for time-series biometric data management. 

Data flows symmetrically through the system layers:
`Routes -> Middleware (Security & Tenancy) -> Controllers (Input Parsing) -> Services (Business Logic) -> DB Layer (PostgreSQL)`

---

## Directory and File Breakdown

### 1. Root Configuration & Application Core
* **`package.json` & `package-lock.json`**: Package configuration tracking all required Node.js dependencies and defining core execution scripts (e.g., `start`, `dev`, `migrate`).
* **`Dockerfile`**: Container directives for packaging the backend into an isolated container instance for seamless cloud deployment.
* **`.env` / `.env.example`**: Defines protected environment variables encompassing database URIs, signing secrets, exposed ports, and allowed CORS origins.
* **`.gitignore`**: Guarantees sensitive operational credentials and compilation subfolders are excluded from source control.
* **`src/server.js`**: The overarching service entry point. This file initializes the Express HTTP server, configures external middleware components, defines allowed Cross-Origin protocols, mounts the routing table, establishes the real-time Socket.io engine, and initiates the runtime listener.

### 2. Application Middleware (`src/middleware/`)
Middleware intercepts incoming structural requests to guarantee rigorous system security.
* **`auth.js`**: Inspects incoming JWT validation tokens and validates cryptographic authenticity.
* **`tenancy.js`**: Injects organization filtering parameters into all authorized requests for multi-tenant isolation.
* **`rbac.js`**: Role-Based Access Control orchestrator verifying clinician/admin permissions for specific pathways.
* **`errorHandler.js`**: Standardized module for parsing application exceptions safely into structured HTTP responses.

### 3. API Routes (`src/routes/`)
Registers API paths to corresponding controller operations.
* **`admin.routes.js` / `settings.js`**: System administration and configuration operations.
* **`admissions.routes.js` / `admissions.js` / `beds.js` / `wards.routes.js`**: Patient admission, bed utilization, and ward management.
* **`alerts.routes.js` / `alerts.js`**: Threshold alarms, clinician dismissals, and response evaluation.
* **`ambulance.routes.js`**: Coordination of emergency response and ambulance dispatch telemetry.
* **`appointment.routes.js` / `consult.routes.js` / `handover.routes.js`**: Scheduling, clinical consultations, and shift change knowledge transfers.
* **`auth.routes.js` / `auth.js`**: Authentication, profile management, and token refresh logic.
* **`billing.routes.js` / `audit.js`**: Financial interaction mapping and interaction review streams.
* **`dashboard.js`**: Statistical pathways for optimized analytical aggregates for frontend visualizations.
* **`lab.routes.js` / `medication.routes.js` / `prescription.routes.js` / `symptoms.routes.js`**: Diagnostic reports and treatment/pharmacology planning.
* **`patient.routes.js` / `patients.js`**: Core CRUD routes for identifying and managing medical profiles.
* **`vitals.routes.js` / `vitals.js`**: High-frequency clinical telemetry collection and historical stream querying.
* **`notifications.routes.js` / `notifications.js`**: General system-push streams mapping non-critical notifications.

### 4. Logic Controllers (`src/controllers/`)
Parses request parameters and directs them to the appropriate service logic.
* **`admin.controller.js`**: Orchestrates hospital status aggregation and analytical queries.
* **`admissions.controller.js`**: Manages patient placement logic and bed assignment algorithms.
* **`alerts.controller.js`**: Handles client acknowledgments for critical clinical warnings.
* **`ambulance.controller.js`**: Manages ambulance status, tracking, and dispatching parameters.
* **`auth.controller.js`**: Executes identity hashing and authorization token distribution.
* **`consult.controller.js`**: Captures and parses context for clinical consultation interactions.
* **`doctors.controller.js`**: Manages clinician rosters and personnel profile retrieval.
* **`handover.controller.js`**: Captures and persists shift-change summaries and clinical context.
* **`notifications.controller.js`**: Updates notification states (read/unread) globally.
* **`patient.controller.js`**: Ensures medical profiles are identified accurately for all requests.
* **`prescription.controller.js`**: Compiles dispensing instructions against validated input variables.
* **`vitals.controller.js`**: Maps incoming telemetry points into insertable database parameters.
* **`wards.controller.js`**: Resolves spatial queries relating to hospital floor plans and localization.

### 5. Services Layer (`src/services/`)
Encapsulates complex business logic and database interactions.
* **`admin.service.js`**: Data aggregation for hospital-wide resource utilization and occupancy formulae.
* **`admissions.service.js`**: Solves patient tracking vectors and historical bed alignment updates.
* **`alerts.service.js`**: Fetches and formats unresolved clinical threshold events.
* **`billing.service.js`**: Constructs automated financial interaction summaries based on clinical events.
* **`consult.service.js`**: Manages persistence of cross-domain clinician consultation logs.
* **`doctor.service.js`**: Analyzes personnel matrices for automated clinical scheduling.
* **`handover.service.js`**: Ensures critical knowledge transfer documentation is chronologically accurate.
* **`lab.service.js`**: Stores and indexes structured biological findings and diagnostic results.
* **`medication.service.js` / `prescription.service.js`**: Validates dosages and checks for pharmacology counter-indications.
* **`notification.service.js`**: Decouples and dispatches system updates via Socket.io.
* **`patient.service.js`**: Unifies diagnostic references and current medical state models.
* **`realtime.service.js`**: Socket.io abstraction streaming TimescaleDB events directly to the dashboard.
* **`vitals.service.js`**: Performs efficient time-series analysis against high-frequency telemetry data.

### 6. Database Layer (`src/db/` & `src/config/`)
Orchestrates relational structure and procedural database-level logic.
* **`config/db.js`**: PostgreSQL connection pool management and orchestration.
* **Migrations (`migrations/`)**: 37 incremental SQL schemas defining the relational backbone (Tenancy -> RBAC -> Clinical Tables).
* **Functions & Triggers (`functions/`)**: Sophisticated PostgreSQL algorithms:
    - `001_risk_score_procedure.sql`: Core logic for calculating patient risk vectors.
    - `002_vitals_trigger.sql`: Automatic EWS updates when telemetry hits the DB.
    - `003_icu_escalation.sql`: Automated logic for identifying patients needing higher care.
    - `010_smart_icu_and_events.sql`: Advanced event timeline and smart bed allocation logic.
    - `011_alert_notify.sql`: Database-driven notification triggers for high-severity alerts.

---

## Backend Development Workflow

### 1. Initial Setup
1. **Environment Config**: Copy `.env.example` to `.env` and configure your database credentials.
2. **Dependencies**: Run `npm install` in the `backend/` directory.

### 2. Database Initialization
Ensure Docker is running, then use the root `init_docker.sh` or run manually:
```bash
# Apply all relational migrations in sequence
npm run migrate

# (Optional) Seed the database with sample data
# Usually done via the 'simulator' directory or custom scripts
```

### 3. Adding a New Feature
1. **Database**: Add any required tables/columns via a new SQL script in `src/db/migrations/` and apply it.
2. **Service**: Implement the core business logic in `src/services/`.
3. **Controller**: Create a controller in `src/controllers/` to handle inputs and call the service.
4. **Route**: Define the API path in `src/routes/` and mount it in `src/server.js`.

### 4. Real-Time Integration
To stream events to the frontend:
1. Define a PG listener or trigger in `src/db/functions/`.
2. Update `src/services/realtime.service.js` to emit the appropriate event over Socket.io when the database notifies the API.

---

## Relational Frontend Context
*(Note: As the backend is completely decoupled, frontend functionality maps across these equivalent REST interfaces symmetrically.)*
* **React App Pages (`frontend/src/app/*`)**: Each routing folder intuitively binds corresponding data streams. For instance, `frontend/src/app/patients/` inherently queries `src/routes/patients.js`.
* **Data Contexts / Hooks**: Frontend operations like WebSockets inherently communicate against `src/services/realtime.service.js`.
* **Component UI Modules**: Isolated items like `PatientTimeline.tsx` synthesize complex response structures parsed functionally from the underlying service algorithms.
