# Resume Bullets — IntelliCare Clinical Database Intelligence Platform

Use these as project bullets under your experience or projects section. Each follows the format:  
**Action verb** + **technology/approach** + **complexity/scale** + **measurable result or outcome**.

---

## Database Engineering

- Designed and migrated a 37-migration PostgreSQL schema (TimescaleDB) covering patients, admissions, RBAC, multi-tenancy, billing, audit, and drug interactions — all applied sequentially without an ORM, using raw SQL and PL/pgSQL stored functions.

- Modelled high-frequency patient vitals as a TimescaleDB hypertable (7-day chunk interval, automatic compression after 3 days) and built a `vitals_1m` continuous aggregate to serve pre-computed per-minute averages for dashboard charting, eliminating full-table scans on the hot path.

- Implemented PL/pgSQL triggers for three separate concerns (NEWS2 Early Warning Score on vitals insert, PG NOTIFY for real-time alerting, JSONB audit snapshots on clinical record changes) — each a self-contained, side-effect-free function applied generically across target tables.

- Tuned query performance with covering indexes on `(org_id, admission_id, recorded_at)`, a partial index on unacknowledged alerts, and a pg_trgm trigram index on patient names — reducing repeated admission-scoped vitals queries from sequential scans to index-only reads.

- Built a per-organisation dynamic alert threshold system (`alert_thresholds` table) consumed by the PL/pgSQL EWS trigger, enabling threshold customisation without code changes.

---

## Backend / API Engineering

- Built a Node.js/Express 5 REST API with 14 route groups, wiring controllers thinly to services and isolating business logic (clinical scoring, billing aggregation, drug interaction lookup) in composable service modules.

- Secured all API endpoints with JWT authentication (HS256, configurable expiry), bcrypt password verification, and a two-layer RBAC middleware stack (`requirePermission` checks a user's permission set including wildcard `*`; `requireRole` guards role-sensitive routes) — both verified by a 24-test Jest suite.

- Hardened the authentication layer by eliminating insecure defaults: JWT secret now required at startup (process exits if unset), demo accounts are allow-listed to four fixed email addresses and disabled in production via `NODE_ENV`, and rate limiters enforce 30 requests/15 min on `/auth` and 300 requests/min on `/api`.

- Implemented a real-time alert pipeline using PostgreSQL PG NOTIFY/LISTEN: a PL/pgSQL trigger fires on critical vitals, Node.js subscribes with a dedicated `pg.Client`, and Socket.io broadcasts to per-organisation rooms derived from the verified JWT — with automatic PG reconnection on connection drop.

- Added structured JSON request logging (one line per request: timestamp, request ID, method, path, status, latency ms, org, user) and surfaced an in-process metrics endpoint (`GET /metrics`) tracking vitals recorded, alerts generated, WebSocket connections, and total API requests since startup.

---

## Clinical Intelligence

- Implemented the NHS NEWS2 Early Warning Score algorithm in two independent layers — PL/pgSQL (fires on database insert) and Node.js (serves trend context to the API) — producing a 0–20 risk score across heart rate, SpO2, systolic BP, respiratory rate, and temperature, with category labels (stable / low / medium / urgent).

- Replaced a naive first-vs-last delta trend detector with Ordinary Least Squares linear regression across up to 10 recent vitals readings; require R² ≥ 0.40 as a goodness-of-fit gate before flagging deterioration, eliminating false positives from noise — returning slope and R² for each vital in the API response.

- Built a drug interaction checker that queries a `drug_interactions` join table against all active prescriptions for an admission on every new prescription create, returning severity-labelled warnings to the caller without blocking the write.

---

## Simulator / Data Engineering

- Rewrote a single-profile jitter simulator into a four-state Markov state machine (stable → moderate → critical → recovering) where each state transition follows an empirically tuned probability matrix, generating physiologically plausible vital signs at configurable intervals.

- Applied temporal smoothing (`next = 0.15 × target + 0.85 × current + noise`) and per-state Box-Muller Gaussian noise injection to produce continuous, artefact-containing vital streams that mimic real ICU monitor output, including a 3% random artefact probability per reading.

---

## Frontend

- Built a multi-role Next.js 14 (App Router) SPA with four RBAC-scoped views (Admin, Doctor, Nurse, Patient), real-time vitals charting via Recharts, and a Socket.io RealtimeContext that authenticates the WebSocket connection using the same JWT token as the REST API.

- Centralised all backend API and WebSocket URLs behind a single `lib/config.ts` constant sourced from `NEXT_PUBLIC_API_URL` — eliminating 14 files of hardcoded production hostnames and enabling environment-specific deployment without code changes.
