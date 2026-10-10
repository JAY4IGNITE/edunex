# EduNex

**Student success analytics, explainable risk assessment, and coordinated support.**

EduNex brings academic performance, attendance, learning management system (LMS) activity, engagement, placement, skills, and feedback into one campus analytics workspace. Staff can explore cohort trends, review a student's history and risk factors, and coordinate interventions with an auditable record of decisions.

Built as a React application backed by a FastAPI modular monolith, the project combines deterministic scoring with a reproducible synthetic academic-risk model. Some repository paths and API metadata retain the original **CampusPulse AI** name.

> **Demonstration scope:** All included student records are synthetic. Public demo roles are role previews, not institutional authentication. The model is not validated for real students, and its outputs must not drive automated adverse decisions.

[Capabilities](#capabilities) · [Architecture](#architecture-and-workflow) · [Quick start](#quick-start) · [Verification](#verification) · [Documentation](#documentation)

## Capabilities

| Area | What the application provides |
| --- | --- |
| Student 360 | A consolidated profile with source history across seven domains and explicit handling of missing evidence. |
| Success scoring | Configurable domain weights, renormalized when source domains are unavailable. |
| Risk and explanations | Separate academic and placement assessments, contributing factors, and supporting source evidence. |
| Predictive analytics | A next-semester academic-risk demonstration with a versioned model artifact, evaluation report, and transparent baseline fallback. |
| Cohort exploration | Dashboard filters, segment views, insights, and a student support priority queue. |
| Intervention tracking | Staff-reviewed recommendations, assignments, status updates, version conflict checks, and audit history. |
| Demo access scopes | Admin, Faculty, Mentor, and Counselor views with backend department and assignment scoping. |
| Capacity planning | Editable staffing scenarios, CSV exports, and print-ready reports. |
| Data transparency | Source registry, ingestion quality reports, and dataset provenance. |

## Architecture and workflow

The backend keeps ingestion, analytics, model inference, and intervention management in separate modules within one application. PostgreSQL stores canonical records and operational state. Redis provides optional caching and event distribution; the browser receives update notifications through WebSockets and refetches relevant queries.

```mermaid
flowchart TB
    subgraph DATA["01 · Data preparation"]
        direction LR
        sources["Synthetic source CSVs<br/>Seven student-success domains"]
        ingestion["Ingestion pipeline<br/>Schema validation · deduplication"]
        evidence["Canonical CSVs<br/>Quality report · provenance"]
        sources --> ingestion --> evidence
    end

    subgraph CORE["02 · Application and persistence"]
        direction LR
        db[("PostgreSQL<br/>Student records · scores · interventions · audit")]
        services["Domain services<br/>Student 360 · scoring · risks · segments · insights"]
        model["Model inference<br/>Trusted artifact or baseline fallback"]
        api["FastAPI REST API<br/>Demo session · role and data scoping"]
        support["Intervention service<br/>Recommendations · assignments · status changes"]
        db <--> services
        services --> model
        services <--> api
        model --> api
        api <--> support
        support <-->|"Persist and audit"| db
    end

    subgraph EXPERIENCE["03 · Staff workspace"]
        direction LR
        ui["React + TypeScript<br/>Dashboard · Student 360 · support queue"]
        review["Staff review<br/>Inspect evidence · assign support · track progress"]
        ui <--> review
    end

    subgraph UPDATES["04 · Optional live updates"]
        direction LR
        redis[("Redis<br/>Cache · Pub/Sub")]
        ws["WebSocket notifications<br/>Query invalidation and refetch"]
        redis -.-> ws
    end

    ingestion -->|"Idempotent load"| db
    evidence -->|"Quality and provenance endpoints"| api
    api <-->|"JSON over HTTP"| ui
    services -.->|"Cache reads and writes"| redis
    support -.->|"Invalidate cache and publish events"| redis
    ws -.-> ui

    classDef data fill:#eff6ff,stroke:#2563eb,color:#172554
    classDef application fill:#f0fdfa,stroke:#0f766e,color:#134e4a
    classDef experience fill:#f5f3ff,stroke:#7c3aed,color:#2e1065
    classDef optional fill:#f8fafc,stroke:#64748b,color:#0f172a,stroke-dasharray:5 5
    class sources,ingestion,evidence,db data
    class services,model,api,support application
    class ui,review experience
    class redis,ws optional
```

*Solid arrows show the primary data and request paths. Dashed arrows show optional cache and notification paths. Domain services, inference, intervention handling, and the WebSocket endpoint run within the backend; they are not independently deployed services.*

1. **Prepare evidence.** Validate and deduplicate synthetic source records, write canonical CSVs and quality/provenance reports, and load records into PostgreSQL.
2. **Build assessments.** Calculate initial success scores, academic and placement risks, and segment memberships. Student 360 and analytics services expose the evidence through the API.
3. **Review predictions.** Model inference uses a trusted local artifact. Missing or incompatible artifacts fall back to a deterministic current-assessment score when sufficient inputs exist; that score is not presented as a probability.
4. **Coordinate support.** Staff inspect the evidence and review suggested actions. Intervention changes persist with version checks and audit events.
5. **Refresh the workspace.** When Redis is configured and available, published events reach browser clients through `/ws/updates`. The frontend invalidates queries and fetches updated API data. Core database-backed features remain available without Redis.

### Technology stack

| Layer | Technologies |
| --- | --- |
| Web application | React 19, TypeScript, Vite 7, React Router, TanStack Query |
| Interface and visualization | Tailwind CSS 4, custom CSS, Radix UI, Recharts, Lucide, GSAP |
| API and validation | Python, FastAPI, Pydantic, Uvicorn |
| Persistence | PostgreSQL, SQLAlchemy, Alembic |
| Analytics and modeling | pandas, NumPy, scikit-learn |
| Cache and notifications | Redis, Pub/Sub, WebSockets |
| Verification | pytest, Vitest, Testing Library, Playwright, axe |
| Deployment configuration | Render blueprint for frontend, API, Redis, and PostgreSQL |

## Quick start

### Prerequisites

Use **Python 3.12**, **Node.js 22**, and **PostgreSQL 16** to match the repository's CI environment. Redis is optional for local development.

The commands below use PowerShell and start from the repository root. On macOS or Linux, create the environment with `python3.12 -m venv .venv` and activate it with `source .venv/bin/activate`.

### 1. Configure the database and environment

Create a local PostgreSQL database named `edunex` using an account with permission to create tables. For example, if PostgreSQL command-line tools are available:

```powershell
createdb -U postgres edunex
Copy-Item .env.example .env
```

If `.env` already exists, edit it instead of copying over it. Set these values, replacing the database credentials with your local account:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:your_password@127.0.0.1:5432/edunex
FRONTEND_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
ENVIRONMENT=development
```

Leave `REDIS_URL` empty for a database-only setup, or set it to your Redis connection URL to enable caching and Pub/Sub.

### 2. Initialize and start the backend

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Ingestion loads the committed synthetic dataset and calculates initial assessments. It skips an already complete canonical and derived dataset; it is not a general-purpose overwrite command for existing source records.

### 3. Start the frontend

Open a second terminal at the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the [application](http://127.0.0.1:5173) and use the public demo role selector to explore the workspace. The [API health endpoint](http://127.0.0.1:8000/api/health) checks database connectivity, and [interactive API documentation](http://127.0.0.1:8000/docs) lists the endpoints.

Vite proxies `/api` and `/ws` to `http://127.0.0.1:8000`. No frontend environment file is needed for this default setup.

### Configuration reference

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the API, migrations, and ingestion. |
| `FRONTEND_ORIGIN` | Comma-separated browser origins allowed by the backend. |
| `ENVIRONMENT` | Keep `development` locally; other values enable secure session cookies. |
| `REDIS_URL` | Optional Redis connection for cache and event distribution. |
| `EDUNEX_SESSION_SECRET` | Shared random session-signing value of at least 32 characters for hosted deployments. |
| `EDUNEX_MODEL_PATH` | Optional path to a trusted local version-2 model artifact. |
| `VITE_API_BASE_URL` | Public API origin, without `/api`; configure in `frontend/.env` or the frontend build environment. Leave empty for the local proxy. |
| `EDUNEX_API_PROXY_TARGET` | Server-side environment variable for changing Vite's local API proxy target. |

Backend settings load from the root `.env`. `VITE_` variables are exposed in the browser bundle and must never contain credentials.

## Verification

Run checks from the repository root with the Python environment activated. Backend integration tests require a migrated, seeded **disposable synthetic PostgreSQL database** configured through `DATABASE_URL`.

```powershell
python -m pytest backend/tests -q --basetemp=.phase-work/pytest
npm test --prefix frontend -- --pool=vmThreads --maxWorkers=1
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

For the end-to-end demo journey, keep the API and frontend running, then install the test browser and run:

```powershell
cd frontend
npx playwright install chromium
npm run test:judge
```

The [CI workflow](.github/workflows/ci.yml) provisions PostgreSQL, migrates and seeds the database, runs backend and frontend checks, builds the frontend, and collects browser and accessibility evidence. See the [frontend guide](frontend/README.md#verification) for additional browser checks and configuration.

### Reproduce the data and model

- **Generate source CSVs:** `python backend/scripts/generate_demo.py` uses a fixed seed. Re-run ingestion against a fresh demo database when replacing the generated dataset.
- **Train and evaluate:** `python scripts/train_model.py` reads canonical synthetic CSVs and writes the model artifact and evaluation report. Training does not require a database connection.
- **Review evidence:** The [model card](MODEL_CARD.md) documents the outcome, held-out student and forward-term evaluation, metrics, fallback behavior, and limitations. Full results are in [model-metrics.json](reports/model-metrics.json).

The shipped model has low recall at its fixed threshold and does not replace the deterministic support queue or staff judgment.

## Repository layout

```text
backend/
  app/api/           API routes
  app/core/          Configuration, database, and demo access scopes
  app/models/        SQLAlchemy persistence models
  app/schemas/       Request, response, and canonical data schemas
  app/services/      Analytics, support workflows, cache, and events
  app/ml/            Feature extraction, inference, and model artifacts
  alembic/           Database migrations
  scripts/           Data generation, ingestion, and benchmarks
  tests/             Backend tests
frontend/
  src/               Pages, components, API client, hooks, and styles
  scripts/           Browser verification and performance checks
data/
  demo/              Synthetic source data
  metadata/          Dataset registry and source mappings
  processed/         Canonical CSVs, quality report, and provenance
docs/                Product, domain, and verification documentation
reports/             Model evaluation evidence
scripts/             Model training and repository utilities
render.yaml          Deployment blueprint
MODEL_CARD.md        Model protocol, results, and limitations
```

## Deployment

The [Render blueprint](render.yaml) defines a static frontend, Python API, Redis service, and PostgreSQL database. Its API startup command runs Alembic migrations and synthetic ingestion before starting Uvicorn.

Configure `EDUNEX_SESSION_SECRET` as a shared random value of at least 32 characters in the deployment environment. Check the frontend and API origins when using custom domains; hosted sessions require HTTPS. The blueprint provisions demonstration infrastructure, and provider plan limits should be reviewed before relying on it for persistent availability.

## Responsible use

The public role selector is intended for exploring synthetic records. Missing or expired demo sessions currently fall back to the Admin demo identity, so this mechanism must not be treated as a production access boundary.

Before using real institutional records, replace demo identity handling with institutional authentication and authorization, establish data governance and retention controls, and validate the analytical methods prospectively with the institution. Synthetic model performance does not establish real-world validity or fairness. Staff must retain responsibility for support decisions.

## Documentation

| Guide | Contents |
| --- | --- |
| [Product requirements](docs/PRD.md) | Product context, scope, and requirements. |
| [Data dictionary](docs/data-dictionary.md) and [validation rules](docs/validation-rules.md) | Canonical fields and ingestion expectations. |
| [Student 360](docs/student-360.md) and [success scoring](docs/student-success-score.md) | Profile composition, domain weights, and missing-data handling. |
| [Academic risk](docs/academic-risk.md), [placement risk](docs/placement-risk.md), and [explainability](docs/explainability.md) | Assessment methods and interpretation. |
| [Segmentation](docs/segmentation.md) and [insights](docs/insights.md) | Cohort grouping and insight logic. |
| [Model card](MODEL_CARD.md) | Predictive model protocol, evidence, and limitations. |
| [Demo walkthrough](docs/demo-script.md) | Suggested demonstration flow. |
| [Frontend guide](frontend/README.md) | UI structure, configuration, and browser verification. |
| [Performance evidence](docs/performance/README.md) | Recorded measurements and verification notes. |

## Contributing

Keep changes focused, update relevant documentation when behavior changes, and run the checks appropriate to the affected components. Use synthetic fixtures and include reproducible steps or verification evidence with a pull request.

## License

EduNex is available under the [MIT License](LICENSE). Frontend component attributions are listed in [third-party notices](frontend/THIRD_PARTY_NOTICES.md).
