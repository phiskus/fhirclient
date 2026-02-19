# Plan: Local PostgreSQL Caching Layer for FHIR Patient Manager

## Context

The current app fetches Patient data directly from an external FHIR server on every page load with no caching. Every list view, detail view, and edit pre-load makes a fresh network request to `https://fhir-bootcamp.medblocks.com/fhir`. The goal is to add a local PostgreSQL database as a cache so that the frontend reads from a local Express API server, which serves data from the DB and only downloads new/changed records from the FHIR server using the `_lastUpdated` filter.

**User decisions:**
- New **Node.js/Express backend** (separate from Next.js) owns the DB and proxies writes
- Sync strategy: **FHIR `_lastUpdated` filter** (incremental, not full re-fetch)
- Write strategy: **FHIR server is source of truth** (all writes go to FHIR first, then DB is updated)

---

## Architecture

```
Browser (Next.js)
  └─→ Express API (port 4000)
        ├─→ PostgreSQL (local cache)   ← reads served from here
        └─→ FHIR server                ← writes forwarded here; sync pulls updates
```

The Express API is mounted at `/Patient` (not `/api/patients`) so that the existing URL construction in `src/data/patients.ts` works with only a one-line change to the base URL.

---

## New Files to Create

```
server/
  package.json           Express server manifest
  tsconfig.json          TypeScript config (CommonJS target)
  Dockerfile             Multi-stage Alpine build (mirrors existing Dockerfile pattern)
  src/
    index.ts             Entry: Express app, CORS, routes, sync scheduler
    db.ts                pg Pool singleton + query helper
    schema.sql           DDL for patients + sync_state tables
    sync.ts              FHIR _lastUpdated incremental sync logic
    types.ts             Shared FHIR/Patient TypeScript interfaces
    routes/
      patients.ts        All 5 route handlers (GET list, GET one, POST, PUT, DELETE)
```

---

## Database Schema (`server/src/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS patients (
    id            TEXT        PRIMARY KEY,
    given         TEXT        NOT NULL DEFAULT '',
    family        TEXT        NOT NULL DEFAULT '',
    name          TEXT        NOT NULL DEFAULT '',
    gender        TEXT        NOT NULL DEFAULT '',
    birth_date    TEXT        NOT NULL DEFAULT '',   -- stored as YYYY-MM-DD string
    phone         TEXT        NOT NULL DEFAULT '',
    fhir_resource JSONB       NOT NULL,              -- full raw FHIR Patient JSON
    last_updated  TIMESTAMPTZ,                       -- from meta.lastUpdated
    synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_family     ON patients (family);
CREATE INDEX IF NOT EXISTS idx_patients_gender     ON patients (gender);
CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients (birth_date);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm  ON patients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm ON patients USING GIN (phone gin_trgm_ops);

CREATE TABLE IF NOT EXISTS sync_state (
    id             INTEGER PRIMARY KEY DEFAULT 1,
    last_sync_time TIMESTAMPTZ,
    CHECK (id = 1)
);

INSERT INTO sync_state (id, last_sync_time) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
```

Key decisions: `birth_date` as TEXT (avoids timezone coercion), `fhir_resource JSONB` for full fidelity, `pg_trgm` for fast ILIKE name/phone search.

---

## Express API Endpoints

All mounted at `/Patient` to match the URL patterns `patients.ts` already builds.

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/Patient` | Serve from DB; trigger background sync if stale (>5 min); return FHIR Bundle |
| GET | `/Patient/:id` | Serve from DB; fall back to FHIR on cache miss |
| POST | `/Patient` | Forward to FHIR → on success, upsert into DB → return created resource |
| PUT | `/Patient/:id` | Forward to FHIR → on success, upsert into DB → return updated resource |
| DELETE | `/Patient/:id` | Forward to FHIR → on success, `DELETE FROM patients WHERE id=$1` → 204 |
| POST | `/api/sync` | Manually trigger full incremental sync; returns `{syncedCount, lastSyncTime}` |
| GET | `/health` | `{status: "ok"}` liveness check |

The GET list handler accepts the same FHIR params the frontend sends: `_count`, `_offset`, `_total`, `_sort`, `name`, `family`, `given`, `gender`, `birthdate`, `telecom` — translated to SQL column names and ILIKE / exact match conditions.

**`_sort` translation map (FHIR field → SQL column):**
```
name → name,  family → family,  given → given,
gender → gender,  birthdate → birth_date,  telecom → phone
```

---

## Sync Logic (`server/src/sync.ts`)

```
syncPatients():
  1. Read last_sync_time from sync_state (NULL = first run)
  2. Build FHIR URL:
     - First run:    GET /Patient?_count=100&_sort=-_lastUpdated
     - Incremental:  GET /Patient?_lastUpdated=gt<last_sync_time>&_count=100
  3. Follow bundle "next" pagination links until exhausted
  4. For each resource: UPSERT into patients table (ON CONFLICT DO UPDATE)
  5. UPDATE sync_state SET last_sync_time = NOW()
  6. Return { syncedCount, lastSyncTime }
```

Scheduler in `index.ts`:
- Run once on startup (after 2s DB warm-up delay)
- `setInterval` every 5 minutes (`SYNC_INTERVAL_MS` env var)
- `let isSyncing = false` guard prevents concurrent syncs

Stale-triggered sync on GET list requests:
- Check `now - last_sync_time > CACHE_STALE_MS` (default 5 min)
- If stale and not already syncing: `syncPatients().catch(console.error)` — fire-and-forget, returns cached data immediately

---

## Changes to Existing Files

### `src/data/patients.ts` — 1 line change (line 4)

```typescript
// Before:
const FHIR_SERVER_URL = process.env.NEXT_PUBLIC_FHIR_SERVER_URL || 'https://fhir-bootcamp.medblocks.com/fhir';

// After:
const FHIR_SERVER_URL = process.env.NEXT_PUBLIC_FHIR_SERVER_URL || 'http://localhost:4000';
```

No other changes. All URL construction, FHIR conversion logic, `loggedFetch` wrapper, and monitoring log remain identical.

### `docker-compose.yml` — add 2 services, update fhirclient build arg

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: fhirdb
      POSTGRES_USER: fhir
      POSTGRES_PASSWORD: fhir_secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/src/schema.sql:/docker-entrypoint-initdb.d/001_schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fhir -d fhirdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./server
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://fhir:fhir_secret@postgres:5432/fhirdb
      - FHIR_BASE_URL=https://fhir-bootcamp.medblocks.com/fhir
      - PORT=4000
      - SYNC_INTERVAL_MS=300000
      - CACHE_STALE_MS=300000
    depends_on:
      postgres:
        condition: service_healthy

  fhirclient:
    build:
      context: .
      args:
        NEXT_PUBLIC_FHIR_SERVER_URL: http://localhost:4000   # ← changed from FHIR URL
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - api

volumes:
  postgres_data:
```

> **Note:** `NEXT_PUBLIC_FHIR_SERVER_URL` is baked at build time into the browser bundle. For Docker Compose the value must be the host-accessible URL (`http://localhost:4000` for local dev). Inside the Docker network, `api` refers to the Express service but that hostname is not reachable from a user's browser.

### `.env.example` — add new variables

```
# Next.js frontend points to Express API (not FHIR directly)
NEXT_PUBLIC_FHIR_SERVER_URL=http://localhost:4000

# Express API server (create server/.env for local dev)
DATABASE_URL=postgresql://fhir:fhir_secret@localhost:5432/fhirdb
FHIR_BASE_URL=https://fhir-bootcamp.medblocks.com/fhir
PORT=4000
SYNC_INTERVAL_MS=300000
CACHE_STALE_MS=300000
```

---

## Express Server Dependencies (`server/package.json`)

**Production:** `express`, `pg`, `cors`
**Dev:** `@types/express`, `@types/pg`, `@types/cors`, `@types/node`, `typescript`, `ts-node-dev`

No ORM (schema is simple), no `node-fetch` (use built-in `fetch` from Node 18+).

---

## Key Design Notes

1. **FHIR Bundle response shape preserved.** `GET /Patient` returns `{"resourceType":"Bundle","type":"searchset","total":N,"entry":[...]}` — exactly what `patients.ts` parses today. No changes to parsing logic.

2. **Content-Type parsing.** Frontend sends `Content-Type: application/fhir+json` for writes. Express middleware: `express.json({ type: ['application/json', 'application/fhir+json'] })`.

3. **`updateOne` efficiency gain.** Currently `updateOne` makes 2 FHIR calls (GET + PUT). After this change, the GET hits the local cache — only the PUT goes to the FHIR server.

4. **Monitoring log continuity.** `loggedFetch` records the URL it calls. After the change, the monitoring dashboard will show `http://localhost:4000/Patient?...` URLs — correctly reflecting what the frontend is doing. No changes to `apiLog.ts` or `MonitoringDashboard.tsx`.

5. **CORS.** Express server must allow requests from `http://localhost:3000` (and any production origin). The `cors()` middleware handles this.

---

## Implementation Order

1. Create `server/` with `package.json`, `tsconfig.json`
2. Write `server/src/schema.sql`
3. Write `server/src/db.ts` — pg Pool
4. Write `server/src/types.ts` — copy FHIR types from `patients.ts`
5. Write `server/src/sync.ts` — `fhirToRow`, `upsertPatient`, `syncPatients`
6. Write `server/src/routes/patients.ts` — all 5 handlers
7. Write `server/src/index.ts` — wire app, mount routes, start scheduler
8. Edit `src/data/patients.ts` line 4 — change base URL
9. Edit `docker-compose.yml` — add postgres + api services
10. Edit `.env.example` — add new variables
11. Write `server/Dockerfile`

---

## Verification

```bash
# 1. Start the stack
docker compose up --build

# 2. Trigger manual sync and verify
curl -X POST http://localhost:4000/api/sync
# → {"syncedCount": N, "lastSyncTime": "..."}

# 3. Verify FHIR Bundle shape
curl "http://localhost:4000/Patient?_count=5"
# → {"resourceType":"Bundle","type":"searchset","total":N,"entry":[...]}

# 4. Check DB directly
psql postgresql://fhir:fhir_secret@localhost:5432/fhirdb -c "SELECT count(*) FROM patients;"

# 5. Open frontend
open http://localhost:3000/patients
# → Patient list loads; monitoring tab shows http://localhost:4000/Patient URLs

# 6. Verify incremental sync (force stale)
psql ... -c "UPDATE sync_state SET last_sync_time = NOW() - INTERVAL '10 minutes';"
curl "http://localhost:4000/Patient?_count=10"
# → Server logs show "[sync] Completed: N patients synced"

# 7. Create/edit/delete round trip in frontend UI
# → Verify changes appear immediately and persist in DB
```
