# Interview Preparation — IntelliCare

Every answer here is grounded in the actual code. No invented metrics, no inflated claims.

---

## Database Design

**"Walk me through your database design decisions."**

The schema is 37 sequential SQL migrations — no ORM. I chose raw SQL because ORM abstraction layers make it easy to accidentally issue N+1 queries or miss index hints, and in a clinical setting where query patterns are known upfront, explicit SQL is cheaper to reason about.

The most interesting decision was splitting time-series vitals (TimescaleDB hypertable, 7-day chunks, compressed after 3 days) from relational data (patients, admissions, RBAC). The hypertable handles append-only, high-frequency inserts; relational tables handle low-write, complex-join operations. I built a continuous aggregate (`vitals_1m`) that pre-computes per-minute averages — this means the dashboard aggregation endpoint runs against ~60 rows per hour of data rather than thousands of raw readings.

**"What's the difference between a hypertable and a regular table?"**

A hypertable is PostgreSQL with TimescaleDB's partitioning layer on top. Physically it shards data into "chunks" by time range (here 7 days). Queries with a `WHERE recorded_at BETWEEN ...` condition only touch the relevant chunks — the planner excludes cold chunks entirely. TimescaleDB also compresses chunks older than 3 days using its columnar format, which reduces storage ~10x for time-series data. For the API consumer it's still just a table — `SELECT` works identically.

**"Why not use an ORM like Prisma or Sequelize?"**

For a schema with TimescaleDB hypertables, continuous aggregates, PL/pgSQL triggers, and trigram indexes, no ORM supports those features natively. You end up writing raw SQL anyway via `queryRaw`. Starting with `pg` and explicit queries means the schema is authoritative, migrations are readable diffs, and there's no abstraction mismatch to debug.

**"How does your multi-tenancy work? Is it Row-Level Security?"**

No — it's application-layer tenancy. Every table has an `org_id` column. The `tenancy` middleware extracts `org_id` from the verified JWT and writes it to `req.orgId`. Every service function receives `orgId` as a parameter and appends `AND organization_id = $N` to every query. This is simpler and auditable in code review. The honest limitation: a bug in a service function could omit the filter. RLS would enforce isolation at the PostgreSQL level regardless of application bugs — that's the upgrade path if this became a production multi-tenant SaaS.

---

## Real-Time Pipeline

**"How does the real-time alerting work end to end?"**

1. A vitals INSERT lands in PostgreSQL.
2. A PL/pgSQL trigger (`alert_notify`) fires `pg_notify('alert_channel', payload::text)` with the alert JSON.
3. Node.js holds a dedicated `pg.Client` subscribed via `LISTEN alert_channel`. This is separate from the pool — it's a persistent connection whose only job is to receive notifications.
4. On notification, the Node listener emits a Socket.io event to the org's room (`org_${org_id}`). The room was joined when the WebSocket connected, after the server verified the JWT from `socket.handshake.auth.token`.
5. The client receives the event and updates the dashboard without polling.

The PG LISTEN connection has a reconnection loop with a 5-second delay on error or disconnect. This survives transient DB restarts.

**"Why PG NOTIFY instead of Redis pub/sub or Kafka?"**

For a single-node deployment, PG NOTIFY means zero additional infrastructure. The database is already the source of truth for alerts, so having the trigger fire the notification in the same transaction (or as close to it) is simpler and eliminates the dual-write problem. At scale — multiple backend nodes, cross-region — Redis pub/sub or a message broker would be appropriate. For a portfolio project demonstrating PostgreSQL capabilities, PG NOTIFY is the right choice.

---

## Clinical Algorithms

**"How does the Early Warning Score work?"**

I implemented NHS NEWS2 — a validated clinical scoring system. It scores five vital signs: heart rate, SpO2, systolic blood pressure, respiratory rate, and temperature. Each vital maps to a score from 0–3 based on clinical thresholds. The total determines risk category: 0–4 = stable, 5–6 = low/medium, 7+ = urgent. I implemented it twice: in PL/pgSQL (fires on every vitals insert) and in Node.js (for API trend context). The PL/pgSQL version is configurable — per-org threshold overrides are stored in `alert_thresholds` and joined at trigger time.

**"What's the difference between your trend detection and EWS?"**

EWS is a point-in-time snapshot — it scores the latest single reading. Trend detection looks at the last 10 readings and fits an Ordinary Least Squares regression line to each vital. If the slope exceeds a threshold *and* R² ≥ 0.40 (indicating a genuine linear relationship rather than noise), the vital is flagged as deteriorating. A patient could have a stable EWS score but a rising heart rate trend — the trend would catch early deterioration before thresholds are breached.

**"Why R² = 0.40 specifically?"**

0.40 means 40% of variance in the vital is explained by time progression — a moderate but meaningful trend. Below that, the relationship is too noisy to act on. This threshold was chosen to be conservative: better to miss a weak trend than to alarm clinicians on noise. With more domain data, a receiver operating characteristic (ROC) curve analysis could tune this to optimise sensitivity/specificity.

---

## Security

**"What security vulnerabilities did you find and fix in this project?"**

Four concrete findings, all fixed:

1. **JWT secret fallback**: `jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production')` — the fallback meant any token signed with the default secret was valid. Removed the fallback; the server now calls `process.exit(1)` at startup if `JWT_SECRET` is unset.

2. **Open mock login**: The auth controller accepted any email/password and returned a JWT. Fixed with an explicit `DEMO_ACCOUNTS` allow-list (4 email addresses), bcrypt verification, and `NODE_ENV !== production` gate.

3. **RBAC operator precedence bug**: `normalizedRoles.includes(userRole) || normalizedRoles.includes('admin' && userRole.includes('admin'))` — `'admin' && userRole.includes('admin')` evaluates to a boolean, so the second `.includes()` always received `true` or `false`, never a string. Fixed with `(userRole.includes('admin') && normalizedRoles.some(r => r.includes('admin')))`.

4. **WebSocket org room trust**: The client was calling `socket.emit('join-org', clientSuppliedOrgId)`. Fixed by moving org room assignment to the server: after JWT verification on `connection`, the server calls `socket.join('org_' + decoded.org_id)`. The client no longer controls which org room it's in.

**"Did you implement HTTPS?"**

The backend sits behind Docker Compose and is expected to run behind a reverse proxy (nginx, Caddy, Render's routing layer) that terminates TLS. Adding TLS inside Node.js for a portfolio API would be correct for production but is unnecessary complexity for local development. In a real deployment, I'd use a managed SSL certificate from the hosting platform.

---

## Architecture Decisions

**"Why Express 5 instead of Fastify or Hono?"**

Familiarity and ecosystem breadth. Express 5 adds native async error propagation — `async` route handlers that throw now automatically reach the error handler without `try/catch` wrappers everywhere. For a project that's already Express-idiomatic, upgrading to v5 is a net win with zero migration pain.

**"Why static export for Next.js?"**

`output: 'export'` means the frontend builds to pure HTML/CSS/JS with no Node.js server required — it can be served from any CDN or static host. The trade-off is no server-side rendering, no dynamic routes at the framework level, and no API routes. For this project the backend is a separate Node.js API, so there's no API route needed in Next.js; the SSR loss is acceptable because the dashboard data is user-specific (RBAC-gated) and fetched client-side after authentication anyway.

**"What would you change if this were going to production?"**

1. RLS at the PostgreSQL layer for true multi-tenant isolation.
2. Refresh tokens (short-lived access tokens + long-lived refresh tokens stored in `httpOnly` cookies).
3. OpenTelemetry instrumentation instead of the current simple in-process counters.
4. Health-checked database connection pool metrics exported to Prometheus.
5. A migration lock (e.g. Flyway or a custom advisory lock) to prevent concurrent migration runs.
6. The continuous aggregate refresh policy needs tuning — currently on TimescaleDB defaults; a real deployment would set refresh interval based on dashboard latency requirements.
