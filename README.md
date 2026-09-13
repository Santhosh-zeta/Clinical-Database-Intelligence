# IntelliCare — Clinical Database Intelligence Platform

A full-stack hospital intelligence system built to demonstrate production-grade database engineering, real-time event pipelines, and clinical decision support. Every feature listed here exists in the committed code.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router, static export)                     │
│  AuthContext · RealtimeContext · RBAC-aware views           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST + Socket.io (JWT auth)
┌──────────────────────▼──────────────────────────────────────┐
│  Node.js / Express 5                                         │
│  Auth · RBAC middleware · Rate limiting · Structured logs    │
│  Controllers → Services → DB                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ pg driver + PG NOTIFY/LISTEN
┌──────────────────────▼──────────────────────────────────────┐
│  PostgreSQL 16 + TimescaleDB                                 │
│  37 migrations · Hypertable · Continuous aggregates          │
│  PL/pgSQL triggers · JSONB audit log · RBAC schema           │
└─────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Simulator (Node.js, headless)                               │
│  Markov state machine · Box-Muller noise · 3% artefact rate  │
└─────────────────────────────────────────────────────────────┘
```

---

## What Is Actually Implemented

| Feature | Reality |
|---|---|
| TimescaleDB hypertable for vitals | ✅ migration 006; 7-day chunk interval, compression after 3 days |
| Continuous aggregate `vitals_1m` | ✅ defined in migration 012; **and** queried via `GET /api/vitals/aggregate/:id` |
| NEWS2 Early Warning Score | ✅ JS (`calculateEWS.js`) **and** PL/pgSQL trigger (`007_ews_trigger.sql`) — identical scoring logic |
| OLS trend detection (R² ≥ 0.40) | ✅ `detectTrend.js` — linear regression, not first-vs-last delta |
| Real-time alerting | ✅ PG NOTIFY trigger → PG LISTEN in Node → Socket.io org rooms |
| Socket.io JWT authentication | ✅ server verifies token on `connection`; org room derived from JWT, not client input |
| RBAC (roles, permissions) | ✅ DB schema + `requirePermission` / `requireRole` middleware |
| Multi-tenancy | ✅ `org_id` on all tables; `tenancy` middleware injects from JWT — **not RLS** |
| Drug interaction check | ✅ `drug_interactions` table; queried on every `POST /api/prescriptions` |
| Audit log | ✅ PL/pgSQL trigger writes JSONB snapshots to `audit_logs` |
| Billing / invoicing | ✅ `generateInvoice()` links clinical events (labs, meds, consults, accommodation) |
| Rate limiting | ✅ 30 req/15 min on `/api/auth`, 300 req/min on `/api/*` |
| Structured request logging | ✅ JSON lines per request with request ID, latency, org, user |
| Markov state-machine simulator | ✅ 4 states (stable/moderate/critical/recovering) + temporal smoothing |
| JWT + bcrypt authentication | ✅ real bcrypt verify; demo accounts allow-listed, disabled in production |
| Unit test suite | ✅ 24 tests, 4 suites (Jest): EWS, trend detection, auth, RBAC |

| Claim NOT implemented |
|---|
| Row-Level Security (RLS) — tenancy is application-layer only |
| Machine-learning or predictive AI — EWS and trend are deterministic algorithms |
| HIPAA / SOC 2 compliance — no compliance certification |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Recharts, Socket.io-client |
| Backend | Node.js 18+, Express 5, Socket.io 4, jsonwebtoken, bcryptjs, express-rate-limit |
| Database | PostgreSQL 16, TimescaleDB 2.x |
| ORM / Query | node-postgres (`pg`) — raw SQL, no ORM |
| Infrastructure | Docker, Docker Compose |
| Testing | Jest 30 |

---

## Database Design Highlights

- **37 migrations** in sequential order — no manual schema edits needed
- **Hypertable** (`vitals`) with 7-day chunk interval; compression policy after 3 days
- **Continuous aggregate** (`vitals_1m`) — pre-computes per-minute avg HR, BP, SpO2, RR, temp
- **PL/pgSQL NEWS2 trigger** fires on every vitals insert; configurable per-org thresholds via `alert_thresholds` table
- **PG NOTIFY** (`alert_notify` trigger) → Node `PG LISTEN` → Socket.io broadcast; reconnects automatically on PG connection drop
- **Covering indexes** on `(org_id, admission_id, recorded_at)` for hot vitals queries
- **Partial index** on alerts `WHERE acknowledged = false` for active-alert lookups
- **pg_trgm** trigram index on patient name for fast free-text search
- **JSONB audit snapshots** on critical tables via generic trigger function

---

## API Reference (Selected Endpoints)

```
POST   /api/auth/login                         # JWT login (demo accounts in dev)
GET    /api/vitals/history/:admissionId        # Raw vitals (TimescaleDB hypertable)
GET    /api/vitals/aggregate/:admissionId      # 1-min buckets (continuous aggregate)
GET    /api/vitals/trend/:admissionId          # OLS regression result with R²
GET    /api/alerts                             # Active alerts for org
PATCH  /api/alerts/:id/acknowledge             # Acknowledge alert
POST   /api/prescriptions                      # Create prescription (checks interactions)
POST   /api/prescriptions/check                # Drug interaction check only
GET    /health                                  # Liveness probe
GET    /metrics                                 # In-process counters (vitals, alerts, WS)
```

---

## Quickstart

### Prerequisites
- Docker Desktop
- Node.js ≥ 18
- Git

### 1. Start the Database

```bash
docker compose up -d
# Wait ~15 s for TimescaleDB to initialise
```

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET to a real random value
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npm run migrate
npm run dev        # API on http://localhost:3001
```

### 3. Start the Frontend

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev        # UI on http://localhost:3000
```

### 4. Seed Data and Run Simulator

```bash
cd simulator
npm install
node setup_db.js       # Wards, beds, staff
node seed.js           # Demo patients
node admit_patients.js # Admit patients to beds
node simulate.js       # Continuous vitals stream
```

### 5. Demo Accounts (development only)

| Email | Password | Role |
|---|---|---|
| `a1@intellicare.demo` | `password123` | Admin |
| `d1@intellicare.demo` | `password123` | Doctor |
| `n1@intellicare.demo` | `password123` | Nurse |
| `p1@intellicare.demo` | `password123` | Patient |

Demo accounts are disabled automatically when `NODE_ENV=production`.

---

## Running Tests

```bash
cd backend
npm test
# 24 tests, 4 suites — all pass without a database connection
```

---

## Known Limitations

- Multi-tenancy uses application-layer `org_id` filtering, not PostgreSQL Row-Level Security. A bug in a service function could leak cross-org data.
- The frontend is a static export (`output: 'export'` in `next.config.ts`). WebSocket works because Socket.io falls back to HTTP polling for static hosts; server-side rendering is not available.
- The EWS trigger and the Node.js `calculateEWS` function implement the same NEWS2 algorithm independently. They should agree, but divergence is possible if one is updated without the other.
- `DEMO_PASSWORD` defaults to `password123`. Change it in `.env` for any internet-exposed instance.

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/       # Thin HTTP handlers
│   │   ├── services/          # Business logic (vitals, alerts, billing, realtime)
│   │   ├── functions/clinical # calculateEWS.js, detectTrend.js
│   │   ├── middleware/        # auth, rbac, tenancy, logger, errorHandler
│   │   ├── routes/            # Express routers
│   │   ├── config/db.js       # pg Pool
│   │   ├── db/migrations/     # 37 SQL migrations (run sequentially)
│   │   └── db/functions/      # PL/pgSQL triggers (EWS, NOTIFY, audit)
│   └── __tests__/             # Jest unit tests
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # UI components
│       ├── contexts/          # AuthContext, RealtimeContext
│       └── lib/config.ts      # Central API base URL (NEXT_PUBLIC_API_URL)
└── simulator/
    └── simulate.js            # Markov state-machine vitals generator
```
