# Clinical Decision Support & Hospital Intelligence System

This implementation plan outlines the architecture, database design, and development workflow for building an intelligent hospital management system. The system integrates a traditional relational database with a time-series database to track patient records, monitor vitals continuously, dynamically generate risk scores, and automate ICU escalation and alerts.

## User Review Required

> [!IMPORTANT]
> **Database Architecture Decision:**
> The PRD proposes combining PostgreSQL (relational) with a Time-Series DB (e.g., TimescaleDB or InfluxDB). 
> **Recommendation:** We should use **TimescaleDB** as it acts as an extension to PostgreSQL. This allows us to keep all relational data (patients, doctors) and time-series data (vitals) in a *single database instance*, drastically simplifying the query logic, triggers, and deployment. Please confirm if this approach is preferred or if you explicitly want a separate system like InfluxDB.

> [!IMPORTANT]
> **Frontend Choice:** 
> For the React.js dashboard, would you prefer using a framework like **Vite (pure React, Single Page App)** or **Next.js (React framework with built-in routing and App Router)**? Vite is typically faster to set up for internal dashboards, while Next.js is better if SEO or server-side rendering is needed (though not typically required for internal hospital tools).

## System Architecture Overview

**1. Database Layer (PostgreSQL + TimescaleDB)**
- Central repository for both structured hospital data and high-frequency patient vitals.
- **Intelligence at DB Level:** Implementing PostgreSQL Triggers and Stored Procedures to automatically calculate risk scores and log alerts directly within the database when anomalous vitals are ingested.

**2. Backend Layer (Node.js/Express.js)**
- RESTful APIs to handle CRUD operations for hospital management (patients, doctors, wards).
- Data ingestion endpoints for vitals, optimized for high write loads.
- WebSockets or Server-Sent Events (SSE) to push real-time alerts to the frontend.

**3. Frontend Layer (React.js + TailwindCSS + Recharts)**
- A comprehensive dashboard for active monitoring.
- Visualizing time-series vitals charts.
- Displaying real-time notifications, a risk-scoring grid, and ICU bed availability.

## Proposed Development Phases

### Phase 1: Database Setup & Intelligence
We will start by establishing the core foundation.
- Initialize robust PostgreSQL schema for Relational Entities (`patients`, `doctors`, `departments`, `admissions`, `wards`, `beds`).
- Initialize TimescaleDB hypertable for Time-Series Entity (`vitals`).
- Create SQL Stored Procedures and Triggers:
  - Calculate `risk_score` upon new vital insertion.
  - Automatically create `alerts` if thresholds are breached (e.g., HR > 120 or SpO2 < 90).
  - Automate ICU bed allocation logic if an alert is escalated.

### Phase 2: Node.js Backend API
- Setup Express.js application with TypeScript for type safety.
- Expose REST endpoints for frontend integration.
- Setup a WebSocket/Socket.io server to stream live DB changes (alerts) to connected frontend clients.

### Phase 3: React.js Frontend Dashboard
- Build UI components using TailwindCSS and Shadcn UI components for a modern, sleek interface.
- Integrate interactive charts (Recharts or Chart.js) for continuous patient vitals monitoring over time.
- Implement the dashboard view to display notifications, incoming risk alerts, and patient lists.

## Proposed File & Folder Structure

```
/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # API route definitions
│   │   ├── db/           # Database connections and query utilities
│   │   ├── triggers/     # SQL files for DB init (Stored procedures, Triggers)
│   │   └── server.ts     # Main backend entry point
│   └── package.json
├── frontend/             # React Dashboard
│   ├── src/
│   │   ├── components/   # Reusable UI parts (Charts, Cards, Tables)
│   │   ├── pages/        # Dashboard, Patient View, Settings
│   │   ├── services/     # API client and WebSocket handlers
│   │   └── App.tsx       # Main router
│   └── package.json
└── README.md
```

## Open Questions

1. **Authentication:** Do we need to implement JWT-based login (Role-Based Access Control) for Doctors vs Admins in this initial version, or should we mock authentication for now to focus on the core intelligence and vitals workflow?
2. **Design System:** You requested standard React.js. I plan to use Tailwind CSS + Shadcn UI for a modern, highly functional, and beautiful aesthetic. Is that acceptable?
3. **Mock Data:** Do you want me to write a seeder script that continuously generates realistic random "patient vitals" in the background so you can see the dashboard charts moving and alerts triggering live?

## Verification Plan

### Automated Tests
- Database unit testing: Insert synthetic normal and abnormal vitals to verify that triggers fire correctly, risk scores update, and alerts are spawned in the database without standard backend logic.

### Manual Verification
- Start the Node API and React frontend locally.
- Run the mock data generator script.
- Visually verify that the React dashboard updates in real-time as vitals fluctuate, and alerts pop up on the screen dynamically when critical thresholds are reached.
