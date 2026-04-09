# Clinical Database Intelligence - Frontend Architecture & Documentation

This repository contains the Next.js frontend application for the Clinical Database Intelligence System. Designed as a real-time clinical command center, it translates raw PostgreSQL/TimescaleDB telemetry (delivered via the Node.js backend) into actionable, high-fidelity UI dashboards for hospital staff.

## System Architecture

The frontend is built on **Next.js (App Router)** utilizing **React** for declarative UIs, **TailwindCSS** for rapid semantic styling, and **Socket.io-client** for real-time WebSocket state management.

The architectural flow is:
`Global Contexts (Auth/Realtime) -> Layout Wrappers (Shell/Guards) -> Page Routes -> UI Components`

---

## Directory and File Breakdown

### 1. Application Routing & Views (`src/app/`)
The Next.js App Router structure where each directory maps to an active clinical URI path.
* **`layout.tsx` & `page.tsx`**: The foundational entry points. `layout.tsx` wraps the entire application with necessary context providers (AuthContext, RealtimeContext) and rendering rules, while `page.tsx` acts as the landing or authentication page.
* **`globals.css`**: Injects Tailwind base styles, utility classes, and custom css-variable themes across the entirety of the project workspace contextually.
* **`dashboard/`**: The main organizational command center. Consumes metric aggregates to render hospital overviews natively.
* **`patients/`**: Core views for navigating patient lists, reading specific demographic information, and jumping into granular clinical timelines.
* **`vitals/`**: Live telemetry dashboards prioritizing high-frequency heart-rate, BP, and SPO2 tracking.
* **`alerts/`**: Alarm management queues allowing clinicians to escalate, dismiss, or acknowledge AI-generated risk evaluations.
* **`icu/` / `users/` / `settings/`**: Operational views handling Intensive Care specific visualizations, staff management panels, and global system parameter adjustments structurally.

### 2. Layout & Security Components (`src/components/layout/`)
Handles the structural application frame and controls route permission accessibility.
* **`Shell.tsx`**: The primary structural wrapper providing the persistent navigation sidebar, top header, and spacing models defining the application's visual footprint.
* **`AuthGuard.tsx`**: A higher-order security boundary ensuring unauthenticated sessions are immediately redirected prior to accessing sensitive medical routes inherently.
* **`PermissionGuard.tsx`**: An RBAC (Role-Based Access Control) utility ensuring specific UI fragments (like an Admin settings button or prescription issuing component) are only rendered if the active user possesses the needed database role credentials.

### 3. Reusable UI Components (`src/components/ui/`)
Modular, highly reusable React components standardizing clinical data rendering.
* **`AlertCard.tsx`**: Standardizes the rendering of critical alarms detailing urgency matrices, acknowledgment buttons, and timestamped logic elegantly.
* **`BedStatusGrid.tsx`**: Synthesizes layout constraints converting ward structures into interactive matrix boards showing occupancy visually natively.
* **`EWSBadge.tsx` & `RiskBadge.tsx`**: Semantic visual indicators mapping numeric scores structurally to color-coded urgency levels allowing instantaneous risk comprehension systematically.
* **`PatientTimeline.tsx`**: Maps chronological clinical events (admissions, consults, vitals drops) interactively along a linear graphical trace organically.
* **`VitalsChart.tsx`**: Wraps charting libraries transforming continuous TimescaleDB arrays into smooth, responsive spark-lines automatically structurally.

### 4. Application Contexts (`src/contexts/`)
Centralizes state logic preventing recursive prop-drilling across deep component trees.
* **`AuthContext.tsx`**: Maintains the global authorization session storing decoded JWT claims continuously seamlessly exposing `.login()` and `.logout()` methodologies globally.
* **`RealtimeContext.tsx`**: Initializes the global Socket.io client bindings catching `EWS_ALERT` or `VITALS_UPDATE` pushes inherently broadcasting updates cleanly into the React virtual DOM locally.

### 5. Utilities & Schemas (`src/lib/`)
* **`types.ts`**: Holds globally shared TypeScript structural interfaces dictating exactly how a Patient, Vital, or Alert object should be typed, guaranteeing frontend/backend parity.
* **`mockData.ts`**: Isolated fallback data arrays simulating active database streams, heavily utilized during UI development or offline testing strictly.
* **`utils.ts`**: Pure helper functions handling repetitive local logic inherently (e.g., date-time formatting, generic math conversions).

---

## Integration Summary
This frontend repository is bound inherently to the `backend` environment. Any UI action generating an API request matches directly to an active controller mapping on the Node.js backend. As a real-time system, the frontend avoids aggressive polling intervals choosing instead to passively absorb asynchronous updates broadcasted via the backend's continuous PostgreSQL listen-notify mechanisms structurally correctly natively.
