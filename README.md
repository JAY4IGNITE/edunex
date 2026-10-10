# EduNex

EduNex is a student-success analytics demonstration that brings academic, attendance, LMS, engagement, placement, skills, and feedback signals into a cohort dashboard and Student 360 view. Staff can inspect transparent risk explanations, review human-authored support recommendations, and track actions through an audited workflow.

**Data boundary:** the included dataset is synthetic. Demo identities are public role previews, not production authentication. Do not connect real student records or use this application to make an automated adverse decision.

## What the demo contains

- A seven-domain Student Success Score that renormalizes weights when source domains are unavailable.
- Separate academic and placement risk views, explanations, historical summaries, and cohort filters.
- A synthetic, time-forward academic-risk model and a rerunnable evidence report; see [MODEL_CARD.md](MODEL_CARD.md) for measured limitations.
- A priority queue, suggested support actions, staff-reviewed intervention tracker, version checks, and audit history.
- Admin, Faculty, Mentor, and Counselor demo views. The API enforces department or seeded-assignment scope before returning records.
- A cohort capacity scenario with editable staffing assumptions, CSV export, and print view.

Scores and model features summarize associations in the synthetic dataset. They do not establish causes or treatment effects. The planning widget is a scenario calculator, not a staffing recommendation.

## Run locally

Requirements: Python 3.12+, Node.js 20+, and PostgreSQL 16+.

From the repository root, create a database, copy `.env.example` to `.env`, and set `DATABASE_URL` to a local `postgresql+psycopg://` URL. Keep `ENVIRONMENT=development`; production requires a shared random `EDUNEX_SESSION_SECRET` of at least 32 characters.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
python -m alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. The demo login explains that every role and record is synthetic. Regenerate the fixed-seed source files only when needed with `python backend/scripts/generate_demo.py`, then rerun ingestion.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp=.phase-work/pytest
npm test --prefix frontend -- --pool=vmThreads --maxWorkers=1
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

The browser journeys are in `frontend/scripts/`; [CI](.github/workflows/ci.yml) prepares a fresh PostgreSQL database and runs the judge journey against it. The focused backend role, ingestion, readiness, and connection-config suite passed locally. The full local backend suite needs a reachable Postgres instance. See the [Phase 7 verification record](docs/phase-7-gates.md) for the complete gates and current evidence status.

## Deployment notes

`render.yaml` defines the static frontend, API, Redis cache, and Postgres service. On Render Free, the API start command runs Alembic and idempotent synthetic ingestion before starting Uvicorn. Set `EDUNEX_SESSION_SECRET` in the backend service dashboard; never commit that secret.

Render Free is a preview setup. Its web service sleeps after idle time, and its free Postgres database expires 30 days after creation, with 14 days to upgrade before deletion. The judging date and existing database creation date are unknown, so its availability on judging day is unconfirmed. See [Phase 5 deployment notes](docs/phase-5-reliability.md) before creating or relying on the hosted database.

## Responsible use and evidence

- [Model card](MODEL_CARD.md) — outcome definition, split, metrics, calibration, and limitations.
- [Responsible-use mapping](docs/responsible-use-mapping.md) — scope, controls, and known gaps.
- [Demo script](docs/demo-script.md) and [pitch outline](docs/pitch-outline.md).
- [Phase evidence and verification log](tasks/todo.md).

The database contains only synthetic demonstration data. The public role selector is not a real account system and must be replaced with institutional identity, authorization, consent, monitoring, and retention controls before any real-data use.
