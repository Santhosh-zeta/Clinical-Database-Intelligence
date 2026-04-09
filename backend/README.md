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
* **`auth.js`**: Inspects the incoming validation tokens (JWT) and validates cryptographic authenticity before moving request traffic forward.
* **`rbac.js`**: A Role-Based Access Control orchestrator verifying that the active clinician or administrative profile retains the explicit credentials needed to manipulate critical pathways.
* **`tenancy.js`**: Injects absolute organization filtering parameters into all authorized requests explicitly ensuring users only interact with information bound to their tenant scope.
* **`errorHandler.js`**: A standardized catch-all module responsible for parsing application exceptions safely into structured HTTP status structures to prevent unintended stack-trace exposure.

### 3. API Routes (`src/routes/`)
Registers API paths to corresponding controller operations logically compartmentalized by business capability.
* **`admin.routes.js` / `settings.js`**: Endpoints responsible for configuring system administration operations.
* **`admissions.routes.js` / `admissions.js` / `beds.js` / `wards.routes.js`**: Operational paths for admitting new patient records, discharging history, and controlling localized bed utilization mappings.
* **`alerts.routes.js` / `alerts.js`**: Routes that pull triggered threshold alarms and handle clinician dismissal and evaluation responses.
* **`auth.routes.js` / `auth.js`**: Secured communication pipes for authenticating profiles and receiving refreshed credentials.
* **`consult.routes.js` / `handovers.routes.js` / `appointment.routes.js`**: Clinical communication and structured handover transition routing.
* **`dashboard.js`**: Dedicated statistical pathway fetching optimized analytical aggregates meant directly for frontend visualizations.
* **`medication.routes.js` / `prescription.routes.js` / `lab.routes.js` / `symptoms.routes.js`**: Treatment planning paths mapping pharmacology and diagnostic reports.
* **`patient.routes.js` / `patients.js`**: Encompasses standard CRUD routes relating to identifying medical profiles.
* **`vitals.routes.js` / `vitals.js`**: High-frequency payload pathways collecting timestamped vital vectors and querying historical streams.
* **`notifications.routes.js` / `notifications.js`**: General user-push integration streams mapping non-critical notifications.
* **`billing.routes.js` / `audit.js`**: Financial abstraction streams mapping performed interactions securely for review algorithms.

### 4. Logic Controllers (`src/controllers/`)
Extracts parameter queries from URL payloads safely mapping data towards application logic instances.
* **`admin.controller.js`**: Distils dashboard queries gathering structural hospital statuses.
* **`admissions.controller.js`**: Determines structural requirements matching patient status criteria during clinical assignment algorithms.
* **`alerts.controller.js`**: Parses client responses related directly towards critical warnings, mapping acknowledgment payloads.
* **`auth.controller.js`**: Matches identity hashes executing authorization token distributions.
* **`consult.controller.js`**: Captures unstructured clinical consultation interactions parsing context objects correctly.
* **`doctors.controller.js`**: Organizes and retrieves personnel rosters and doctor profiling data objects.
* **`handover.controller.js`**: Captures summarized shift change documentations matching contextual data blocks appropriately.
* **`notifications.controller.js`**: Operates on acknowledgment payloads updating 'read' boolean conditions globally.
* **`patient.controller.js`**: Secures requests identifying required individual profiles correctly preventing null executions.
* **`prescription.controller.js`**: Compiles medical dispensing instructions against structured user input variables.
* **`vitals.controller.js`**: Maps telemetry time-series points converting raw arrays into insertable data parameters reliably.
* **`wards.controller.js`**: Interrogates spatial queries relating specifically to floor plans and localization properties organically.

### 5. Core Services (`src/services/`)
Maintains isolated complex functionality without leaking procedural operations within standard REST routing tables.
* **`admin.service.js`**: Resolves heavy database queries reporting localized active resources and utilization formulas dynamically.
* **`admissions.service.js`**: Synthesizes bed alignment updates resolving patient tracking vectors over extensive temporal models inherently.
* **`alerts.service.js`**: Encapsulates data fetching arrays pulling unresolved multi-score events formatting outputs clearly.
* **`billing.service.js`**: Assembles aggregated interactions logically constructing automated finance outputs reliably structured globally.
* **`consult.service.js`**: Inserts complex referential logs mapping clinician-to-clinician inputs natively across domains appropriately.
* **`doctor.service.js`**: Parses roster matrices establishing valid clinical scheduling operations programmatically automatically.
* **`handover.service.js`**: Executes the persistence logic needed maintaining critical operational knowledge transfers chronologically accurately.
* **`lab.service.js`**: Intercepts diagnostic entries saving biological findings structurally across mapped indexes respectively.
* **`medication.service.js` / `prescription.service.js`**: Handles medication verifications linking dosage rules logically minimizing counter-indications intrinsically systematically.
* **`notification.service.js`**: Dispatches system updates cleanly decoupling general web socket traffic natively directly effectively.
* **`patient.service.js`**: Pulls cohesive representations binding current patient context models unifying diagnostic references intuitively correctly.
* **`realtime.service.js`**: Instantiates specialized socket abstractions streaming asynchronous TimescaleDB events exclusively to frontend dashboards bypassing continuous long-polling restrictions profoundly effectively.
* **`vitals.service.js`**: Interacts specifically against TimescaleDB aggregation constraints generating fast trend analysis mathematically efficiently organically.

### 6. Database Connection (`src/config/`)
* **`db.js`**: Represents the native PG connection pool orchestrating efficient asynchronous concurrent connections reliably linking against the relational backend instance organically.

### 7. Core Database Schema & Migrations (`src/db/`)
Controls structural database evolution consistently maintaining procedural dependencies inherently.
* **`migrate.js` / `robust_migrate.js`**: Procedural executors stepping through relational migrations logically systematically sequentially.
* **`reset.js`**: Rapid teardown protocol used exclusively during internal environment reset parameters cleanly consistently thoroughly.
* **`seed_migrations.js`**: Initializes dummy organizational references required instantiating generic application baselines organically necessarily seamlessly.
* **`migrations/` Folder**: Maintains state-bound definitions configuring the structural properties covering multi-tenant tables natively systematically (from core `patients`/`vitals` tracking toward advanced RBAC/medication definitions incrementally naturally).
* **`functions/` Folder**: Employs sophisticated procedural PostgreSQL algorithms executed natively resolving:
  - Complex vector analytics (`001_risk_score_procedure.sql`, `008_update_risk_score.sql`).
  - Automated escalation engines natively analyzing metric behaviors contextually logically (`003_icu_escalation.sql`, `009_alert_escalation.sql`).
  - Live metric triggers updating contextual early warning score constraints programmatically inherently (`002_vitals_trigger.sql`, `007_ews_trigger.sql`, `010_smart_icu_and_events.sql`).

---

## Relational Frontend Context
*(Note: As the backend is completely decoupled, frontend functionality maps across these equivalent REST interfaces symmetrically.)*
* **React App Pages (`frontend/src/app/*`)**: Each routing folder intuitively binds corresponding data streams. For instance, `frontend/src/app/patients/` inherently queries `src/routes/patients.js`.
* **Data Contexts / Hooks**: Frontend operations like WebSockets inherently communicate against `src/services/realtime.service.js` ensuring the command dashboard correctly interprets automated database triggers natively resolved via PostgreSQL.
* **Component UI Modules**: Isolated items like `PatientTimeline.tsx` organically synthesize complex response structures parsed functionally from the underlying `patient.service.js` algorithms cleanly inherently accurately.
