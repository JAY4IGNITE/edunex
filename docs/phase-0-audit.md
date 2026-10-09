# Phase 0 audit — 2026-10-09

Inventory: `python scripts/audit_inventory.py` writes `docs/repository-inventory.json` with every route handler, ORM table, backend test, frontend test file and route page. Baseline: 23 route handlers (paths are relative to router prefixes in `backend/app/main.py`), 12 tables, 80 backend tests, 8 frontend pages and 11 frontend test files.

## Observed verification

- `npm test --prefix frontend`: 45 tests passed in 11 files.
- `.venv/Scripts/python.exe -m pytest backend/tests -q --basetemp=.phase-work/pytest-baseline`: 78 passed; two ingestion tests could not initialize a missing temporary parent directory. After creating `.phase-work`, running the complete ingestion file with `--basetemp=.phase-work/pytest-ingestion` passed all four tests. This is not a coverage measurement.
- Uvicorn started locally on `127.0.0.1:8011`; `/api/health` returned 200 and `/api/students?limit=1` returned a synthetic student. Database query counted 1,000 students.
- Existing warnings: deprecated Pydantic class configuration, Starlette/httpx deprecation, unawaited coroutine in a mocked websocket test.
- Existing ML test rewrites the tracked joblib artifact. It must use a temporary output in Phase 2; baseline metrics are not being claimed from that artifact.

## Exists

Seven-domain scoring and missing-domain renormalization; academic/placement risk engines; risk drivers, protectors and unavailable signals; Student 360 history; segments; analytics and insights; ingestion/provenance; Redis caching/pubsub; websocket updates; responsive workspace and themed landing page.

## Missing or unreliable

- No intervention recommendations, persisted workflow/audit trail, priority queue or measured follow-up outcomes.
- No server-enforced demo identity/role scope, capacity planner, what-if workflow, or intervention KPIs.
- ML trainer uses train semesters 1/2 and a single validation/test semester 3; no independent test partition, persisted metrics report, calibration, or deterministic-baseline comparison. No model card or metrics page. Missing artifact returns an error rather than a baseline.
- Existing full explanation fails if either risk family has no data. Driver arrays also contain unavailable entries. New recommendations must isolate available families and never count missing data as risk.
- Segment classification reads potentially stale persisted risks and can write on GET. Priority must use one consistent, read-only snapshot.
- Completing an intervention without new observations cannot establish an outcome. Record both snapshots and explicitly mark follow-up availability; never fabricate improvement.
- README describes deterministic scoring as AI, claims unmeasured 100% Core API Coverage, uses the old campuspulse database name, and changes into backend before commands requiring repository-root imports.
- Ingestion skips the entire load when any student exists, which does not recover partial seeding. Some aggregates perform repeated per-student queries. Landing WebGL eagerly loads.
- Render free Postgres expires after 30 days, with 14 days to upgrade before deletion; current DB creation and judging dates are unknown. Source checked 2026-10-09: https://render.com/docs/free . Do not claim judging-date durability.

## Working-tree boundary

Pre-existing edits in backend/app/main.py, the model artifact, frontend/README.md, landing verification and landing CSS are retained. Only task changes are staged for phase commits. No credentials are printed or committed. Live URL could not be inspected by the web fetch tool; local availability does not prove live deployment health.
