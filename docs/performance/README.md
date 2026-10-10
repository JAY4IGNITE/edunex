# EduNex performance implementation report

Measured 2026-10-10. These are local measurements, not production Render results.
The working tree already contained role, capacity-planning, reliability and landing
changes when this task began. Those changes were preserved. No deployment or schema
migration was introduced by this performance slice.

## A. Problems found

- Filtered insights recalculated every visible student's score individually,
  committing and emitting invalidation events during a GET. The seeded benchmark
  issued **10,013 SQL statements** per filtered insight request.
- Dashboard distribution repeated fields already returned by overview. Trends and
  insights then waited through an artificial sequence of requests.
- Distribution cache entries lacked the `analytics` invalidation tag.
- Student offset pagination did not specify a stable order.
- The public entry module eagerly imported the authenticated dashboard shell.
- Optional Redis connections could delay fallback by approximately four seconds
  across GET and SET. Subscriber shutdown closed a socket before its reader exited.
- The deployment ingestion command failed with `ModuleNotFoundError: backend` when
  invoked by file path. Module invocation succeeded on the isolated database.

## B. Changes made

1. Calculate institutional comparison scores from current domain evidence in
   batches of 250 using the existing bulk Student 360 repository and domain-score
   calculation. Preserve weighting, rounding, insufficient-data exclusion and ORM
   role scope. Stop writing scores and publishing updates during this insight read.
2. Reuse overview distributions; launch overview, trends and insights concurrently.
   Existing section skeletons, retries and independent errors remain in use.
3. Attach distribution cache entries to the existing analytics invalidation tag.
4. Order student pages by their unique student ID before offset/limit.
5. Lazy-load the authenticated shell to reduce public-page JavaScript transfer.
6. Set optional Redis connect/read timeouts to 500 ms with no automatic retries;
   preserve SQL fallback. Join the subscriber before closing its socket.
7. Run ingestion as `python -m backend.scripts.run_ingestion` in deployment, CI and
   setup documentation. Correct browser test expectations for existing login routes.

## C. Files changed by this slice

Application: `backend/app/services/insight.py`, `backend/app/api/endpoints/analytics.py`,
`backend/app/api/endpoints/students.py`, `backend/app/core/redis.py`,
`backend/app/services/pubsub.py`, `frontend/src/pages/Dashboard/index.tsx`,
`frontend/src/app/App.tsx`.

Verification: `backend/scripts/benchmark_performance.py`,
`backend/scripts/verify_cache_performance.py`,
`backend/tests/test_performance_regressions.py`, `backend/tests/test_insights.py`,
`backend/tests/test_pubsub.py`, `backend/tests/test_websockets.py`,
`frontend/scripts/benchmark-performance.mjs`,
`frontend/scripts/verify-data-performance.mjs`,
`frontend/scripts/verify-judge-journey.mjs`, `frontend/scripts/verify-landing.mjs`,
`frontend/src/test/dashboard-performance.test.tsx`.

Configuration/docs: `render.yaml`, `.github/workflows/ci.yml`, `README.md`,
`docs/phase-5-reliability.md`, `docs/phase-7-gates.md`, this directory.

## D. Data correctness

Real ORM regression tests cover fresh evidence despite stale saved scores, faculty
scope, no writes during comparisons, stable pages, Redis invalidation and fallback.
The same distribution is used by KPIs/charts on each overview refresh. Auth cache
clearing on role changes and non-admin Redis bypass remain intact. The comparison
still observes the caller's allowed population; it does not bypass scope to obtain
an institution-wide result.

## E. Measured results and tradeoffs

| Measurement | Before | After | Conditions |
|---|---:|---:|---|
| Filtered insights median | 7,528.91 ms | 532.31 ms | 3 runs, Redis disabled, 1,000 seeded students |
| Filtered insights SQL statements | 10,013 | 45 | Every recorded run |
| Filtered insights median SQL execution time | 2,717.98 ms | 93.68 ms | Driver cursor timing; excludes ORM mapping |
| Filtered insights response body | 2,689 bytes | 2,689 bytes | Same endpoint/filters |
| Dashboard usable median | 1,423 ms | 1,040 ms | 5 fresh Chromium contexts, 150 ms API fixtures |
| Dashboard initial API requests | 7 | 6 | Includes health, session and departments |
| Dashboard first KPI median | 941 ms | 1,028 ms | No improvement claimed |
| Public entry JS, raw | 474.24 kB | 346.68 kB | Vite production build |
| Landing encoded JS transferred | 161,895 bytes | 140,847 bytes | Reduced-motion production preview |
| Landing content median | 482 ms | 550 ms | No improvement claimed |
| Dashboard encoded JS transferred | 302,973 bytes | 308,979 bytes | Chunk splitting adds overhead |
| Total emitted JS, raw | 1,556,414 bytes | 1,560,357 bytes | Code moved to deferred chunks, not removed |
| Overview with Redis unreachable | 4,516.67 ms | 1,337.65 ms | One outage sample per version |
| Distribution with Redis unreachable | 4,346.84 ms | 1,294.86 ms | One outage sample per version |

The filtered insight improvement is large relative to the recorded variance; every
after sample is faster than every before sample. Other unchanged endpoints varied
in both directions, so no speedup is attributed to them. Shell splitting is retained
for the measured 13% reduction in landing transfer, not as a latency improvement.
The Three.js background remains deferred at 520 kB raw and keeps Vite's existing
large-chunk warning. It was not removed or visually simplified.

Raw samples: [API before](api-before.json), [API after](api-after.json),
[browser before](browser-before.json), [browser after](browser-after.json),
[cache before](cache-before.json), [cache after](cache-after.json).

## F. Database

Existing primary keys, foreign-key indexes and student/term indexes were inspected.
No index/schema changes were justified by the measured bottleneck. The existing
SQLAlchemy pool (5 connections plus 10 overflow, pre-ping, bounded wait) is reused.
Comparison profile materialization is bounded to 250 students; its ID list still
scales with the visible population. Canonical read queries stay parameterized.

## G. Cache

The existing `edunex:v1` key space and 300-second analytics TTL remain. Distribution
now participates in analytics invalidation. Real Redis tests verified HIT with zero
SQL statements, MISS with 12 statements, invalidation returning to 12 statements,
and identical payloads when disabled/unreachable. Warm hits took approximately
2–7 ms locally. This is a controlled sequence, not a measured production hit rate.

The available Windows Redis is 3.0.504 and requires a **test-only** `protocol=2` URL
with redis-py 8.1.0. Production protocol settings were not changed. Docker was not
running, so current Render Redis compatibility and production hit rate remain to
be measured. No global Redis flush was used; tests invalidate scoped analytics tags
only inside a dedicated database on an isolated Redis port.

## H. Frontend

React 19, React Query 5, React Router 7 and Vite 7 remain. Route splitting, abort
signals, query deduplication, five-minute freshness, section loading/error states,
10-student pages and 25-intervention pages already existed. Exact-ID search is
submitted explicitly and creates no per-keystroke requests, so no debounce library
was added. Charts consume aggregate semester data rather than raw records. Styles,
branding, background, light/dark themes and rounded glass header were retained.

## I. Backend

FastAPI 0.142.4, SQLAlchemy 2.1.4, psycopg 3.3.6 and Pydantic 2.13.5 were installed
for these measurements. Routes continue through authenticated dependencies, scoped
ORM reads, services and existing response models. No response field was removed.
The legacy score write endpoint is unchanged; only the filtered-insight comparison
uses a read-only calculation. API responses retain private/no-store headers.

## J. Deployment

Startup now uses a tested import-safe ingestion command. Existing health checks,
database pooling, Redis URL and frontend API-origin configuration are retained.
No worker-count, region or instance-plan change was made without production evidence.
Render still documents free web sleep after 15 idle minutes and roughly one minute
to wake; free PostgreSQL expires 30 days after creation. Judging/database creation
dates are unknown. [Render free-tier policy](https://render.com/docs/free), checked
2026-10-10. Production cold-start timing was not measured.

## K. Verification

- Production TypeScript check and Vite build passed.
- Frontend: **55 tests passed** across 13 files.
- Backend: **115 tests passed** against an isolated PostgreSQL 18 cluster.
- Real Redis HIT/MISS/invalidation/disabled/unreachable checks passed with equal data;
  shutdown completed without the earlier reader-thread exception after the fix.
- Browser role journey passed: admin dashboard, rendered chart geometry, capacity
  CSV, faculty scope, mentor scope, priority-to-completed intervention, responsive
  tracker at 1440/768/390 px; no uncaught page errors.
- Landing passed: light/dark themes, keyboard skip link, anchor alignment, smooth
  scrolling and reduced-motion behavior; no overflow at seven widths and zero axe
  violations in eight theme/width combinations. Console errors: none.
- Live data navigation passed: chart metric switch, 10-row pagination, department
  filtering with page reset, and exact student-ID profile search.
- Targeted Python unused-name/import checks and `git diff --check` passed.
- Remaining test warning: upstream Starlette/httpx deprecation. Dependencies were
  not upgraded as part of this performance change.

Screenshots and browser JSON are in `.phase-work/performance-landing`,
`.phase-work/performance-journey` and `.phase-work/performance-data` locally.

## L. Remaining bottlenecks and measurement limits

- Segment summary/detail paths and the per-page membership enrichment still call
  dynamic assessments. Those may write and invalidate caches; they need their own
  parity benchmarks before a broader replacement. Priority analysis still examines
  a full scoped cohort before sorting and slicing. These are not claimed optimized.
- Overview/trends independently gather metrics. No shared server snapshot cache or
  background worker was added without a safe invalidation/revocation design.
- The current historical aggregation groups by semester; multi-academic-year
  semantics need a separate data-contract decision before changing chart meaning.
- Redis outage fallback still makes one GET and one SET attempt. A circuit breaker
  could reduce that further but would require recovery and concurrent-request tests.
- No production p95/p99, Core Web Vitals/INP, cold-start duration, query-plan analysis,
  memory ceiling or production cache-hit rate is claimed. Local fixtures isolate
  frontend scheduling; they do not establish end-to-end production latency.
- No hosted deployment was performed. Existing uncommitted work remains intact.

## Rerun

Use an isolated PostgreSQL database named `edunex_perf` on localhost, then set
`DATABASE_URL` to it. Both Python measurement scripts reject other database targets.

```powershell
alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion
# Leave REDIS_URL empty for API timing.
python -m backend.scripts.benchmark_performance --output docs/performance/api-new.json
# Start a disposable Redis on port 56379, database 15, with persistence disabled.
$env:REDIS_URL = 'redis://127.0.0.1:56379/15?protocol=2'
python -m backend.scripts.verify_cache_performance docs/performance/cache-new.json
python -m pytest backend/tests -q
cd frontend
npm test -- --pool=vmThreads --maxWorkers=1
npm run build
npm run preview -- --port 5174
# In another terminal from frontend:
node scripts/benchmark-performance.mjs ../docs/performance/browser-new.json
```

Browser integration scripts also need the API on port 8000 and
`EDUNEX_TEST_BASE_URL=http://127.0.0.1:5174`. The judge script creates synthetic
interventions, so run it only against a disposable database.
