# Phase 7 verification record

The CI workflow uses a fresh PostgreSQL service for every run, applies Alembic migrations, and loads only the repository's synthetic demonstration records before running the backend suite. The frontend check covers tests, the production build, landing-page accessibility, a pinned Lighthouse 13.5.0 measurement of the public landing page, and the authenticated judge journey. The journey exercises the Admin, Faculty, and Mentor views, checks department and caseload boundaries, exports the capacity CSV, completes a staff-reviewed intervention, and verifies responsive widths. Screenshots, Lighthouse JSON/HTML reports, the CSV, and a machine-readable result are uploaded as the `edunex-judge-evidence` artifact.

The Python lint step checks the authorization, readiness, configuration, seed, and related test files with Ruff's correctness and unused-import rules. The repository has legacy Ruff findings outside these files; the CI check is scoped to avoid making unrelated code cleanup a prerequisite for this work.

## Local verification

The commands below are the same checks the workflow runs, except that the workflow provisions its own PostgreSQL service. Set `DATABASE_URL` to a disposable synthetic PostgreSQL database before running migrations, ingestion, or the complete backend suite.

```powershell
ruff check --isolated --select E4,E7,E9,F backend/app/core/config.py backend/app/core/database.py backend/app/core/access_scope.py backend/app/core/demo_auth.py backend/app/main.py backend/app/api/endpoints/auth.py backend/scripts/run_ingestion.py backend/tests/test_auth_scope.py backend/tests/test_config.py backend/tests/test_health.py backend/tests/test_ingestion.py
alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion
python -m pytest backend/tests -q --basetemp=.phase-work/pytest-ci
cd frontend
npm test -- --pool=vmThreads --maxWorkers=1
npm run build
npx playwright install chromium
npm run test:judge
```

## Environment limits

Local focused backend tests and frontend unit/build checks have passed. The configured local database was unreachable during this run, so the complete database-backed pytest suite could not be truthfully reported as locally passing. Playwright Chromium is not installed, and its CDN download failed because DNS could not resolve `cdn.playwright.dev`; the authenticated browser journey and Lighthouse report therefore remain pending. The new workflow has not run remotely from this workspace. Its CI results will be available after the branch is pushed. The Render free-database creation date and judging date were not supplied, so expiry relative to judging remains unknown; Render's documented 30-day expiration still applies.
