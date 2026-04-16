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
* **`Shell.tsx`**: The primary structural wrapper providing the persistent navigation sidebar, top header, and spacing models.
* **`AuthGuard.tsx`**: A higher-order security boundary ensuring sessions are authenticated prior to accessing sensitive medical routes.
* **`PermissionGuard.tsx`**: RBAC utility ensuring specific UI fragments are only rendered if the active user possesses the needed database role credentials.

### 3. Shared Components (`src/components/`)
Modular, reusable React components standardizing clinical data rendering across the application.
* **`dashboard/`**:
    - `StatsHeader.tsx`: Aggregated KPI display for quick clinical oversight.
    - `OccupancyChart.tsx`: Visual breakdown of ward and ICU utilization.
* **`patient/`**:
    - `PatientList.tsx`: Searchable and filterable roster of active hospital admissions.
    - `ClinicalTimeline.tsx`: Chronological visualization of patient events, vitals drops, and medications.
* **`ui/`**: 
    - `AlertCard.tsx`, `EWSBadge.tsx`, `RiskBadge.tsx`: Visual indicators for urgency and alarm management.
    - `VitalsChart.tsx`: Real-time charting for continuous telemetry vectors.

### 4. Application Contexts (`src/contexts/`)
Centralizes state logic preventing recursive prop-drilling across deep component trees.
* **`AuthContext.tsx`**: Maintains the global authorization session and JWT claim persistence.
* **`RealtimeContext.tsx`**: Initializes Socket.io bindings to broadcast `EWS_ALERT` or `VITALS_UPDATE` pushes into the React virtual DOM.

### 5. Utilities & Library (`src/lib/`)
* **`types.ts`**: Globally shared TypeScript structural interfaces for Patients, Vitals, and Alerts.
* **`mockData.ts`**: Fallback data for offline UI development and design system testing.
* **`utils.ts`**: Pure helper functions for formatting, math, and general transformations.

---

## Frontend Development Workflow

### 1. Initial Setup
1. **Environment Config**: Copy `.env.example` (if available) or create `.env.local` to configure `NEXT_PUBLIC_API_URL`.
2. **Dependencies**: Run `npm install` in the `frontend/` directory.

### 2. Running Locally
```bash
# Start the development server on http://localhost:3000
npm run dev
```

### 3. Adding a New Page/Component
1. **Define Types**: Update `src/lib/types.ts` if adding a new data structure.
2. **Component**: Create your UI logic in `src/components/` (use `ui/` for general atoms, or feature-specific folders).
3. **Context**: If shared state is needed, update or add a provider in `src/contexts/`.
4. **Page**: Add a new directory in `src/app/` with a `page.tsx` file to define the new route.

### 4. Style Standards
- Use **Tailwind CSS** for all styling.
- Follow the established design system (see `globals.css` and existing dashboard components) to maintain clinical clarity.

---

## Integration Summary
This frontend repository is bound inherently to the `backend` environment. Any UI action generating an API request matches directly to an active controller mapping on the Node.js backend. As a real-time system, the frontend avoids aggressive polling intervals choosing instead to passively absorb asynchronous updates broadcasted via the backend's continuous Socket.io streams.
