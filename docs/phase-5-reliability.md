# Phase 5: reliability and deployment

## Startup, database readiness, and seeding

The public `/api/health` route runs `SELECT 1` and returns `503` with a generic readiness payload when Postgres cannot be reached. SQLAlchemy and Alembic connection attempts are capped at five seconds, and the application connection pool waits at most ten seconds. The frontend checks health before showing protected pages, retries transient failures with a short backoff, and exposes a retry action after the attempts are exhausted. Redis remains optional; cache failures fall back to Postgres.

Schema is managed by Alembic. `backend/scripts/run_ingestion.py` validates all checked-in synthetic CSV inputs, inserts by natural key with `ON CONFLICT DO NOTHING`, checks exact key coverage to recover partial imports, then calculates derived scores. It seeds the mentor and counselor assignment split after students exist; the migration also seeds existing databases and is safe to rerun. Repeated starts skip recalculation when source and derived records are complete. A missing source file, invalid empty domain, migration error, or database error exits nonzero so the API does not start with an incomplete dataset.

The connection URL accepts Render's `postgres://`/`postgresql://` formats and normalizes them to the installed `psycopg` v3 driver. Local commands from the repository root:

```powershell
Copy-Item .env.example .env
# Set DATABASE_URL to a local PostgreSQL URL and EDUNEX_SESSION_SECRET to a random 32+ character value.
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
.\.venv\Scripts\python.exe -m backend.scripts.run_ingestion
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8012
```

Render's free web service cannot use `preDeployCommand`, so the Blueprint migrates and seeds in the start command before launching Uvicorn. The health check only becomes ready after the database is usable. The static build uses `npm ci` from the committed lockfile. Set `EDUNEX_SESSION_SECRET` in the backend service dashboard; it is intentionally not stored in the repository.

## Render free-tier constraints (checked 2026-10-10)

Render currently spins a free web service down after 15 minutes without inbound HTTP or WebSocket messages; waking it takes about one minute. Free Postgres is limited to 1 GB, one active free database per workspace, has no backups or managed connection pooling, and expires 30 days after creation. After expiry, it is inaccessible unless upgraded, with a 14-day grace period before Render deletes the database and data. The free web service receives 750 shared instance-hours per workspace per month and may restart at any time. See [Render's Free instance limitations](https://render.com/docs/free) and [deploy command support](https://render.com/docs/deploys).

The judging date and this database's creation date were not supplied, so I cannot confirm that the current free database will still be available on judging day. Upgrade the database before expiry for persistence and backups, or plan to recreate it and rerun the migration and synthetic seed commands. Do not use this free configuration for real student data or production reliability.

## Frontend and query resilience

The app already scopes cache keys to cohort filters, clears React Query cache during demo-role changes, bypasses shared cache for non-admin identities, and invalidates tagged aggregates after intervention changes. Student and intervention lists use bounded `limit`/`offset` pagination; student, natural-key, intervention-state, and assignment fields have database indexes. The landing page loads Three.js only after checking WebGL availability and reduced-motion preference. Renderer creation failure leaves a CSS background, and route-level lazy loading remains enabled.

The verified production build passed, with measured output sizes of 474.24 kB for the main UI chunk, 387.78 kB for charts, and 520.45 kB (131.25 kB gzip) for the lazily loaded ColorBends chunk. The CI workflow now runs pinned Lighthouse 13.5.0 against the public landing page and stores JSON and HTML reports with the browser evidence. No Lighthouse report could be captured locally because the browser download is blocked by this environment's DNS/network policy; the measurement remains pending the first CI run. The production bundle still reports a chunk-size warning for the WebGL and charts chunks.

Verification completed: 9 focused backend tests passed (readiness, idempotent upsert SQL, partial natural-key recovery, config URL normalization, and existing ingestion checks); all 54 frontend tests passed with Vitest's `vmThreads` pool; frontend typecheck and production build passed; `render.yaml` parsed successfully. The full backend suite and live analytics render remain blocked on the configured Postgres connection; no connection secrets or data were printed.
