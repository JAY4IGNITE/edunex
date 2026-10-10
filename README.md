# EduNex: Student Success Analytics Platform

[![Build Status](https://img.shields.io/github/actions/workflow/status/JAY4IGNITE/edunex/ci.yml?branch=main&style=for-the-badge)](https://github.com/JAY4IGNITE/edunex/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.12-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![React Version](https://img.shields.io/badge/react-19-blue?style=for-the-badge&logo=react)](https://react.dev/)

**EduNex** is a comprehensive campus analytics workspace designed to unify student success metrics, provide explainable risk assessments, and facilitate coordinated institutional support.

By aggregating academic performance, attendance, learning management system (LMS) activity, engagement, placement, skills, and feedback, EduNex empowers staff to seamlessly explore cohort trends, review detailed student histories, and orchestrate targeted interventions backed by an auditable trail of decisions.

Built as a modern **React** Single-Page Application (SPA) powered by a **FastAPI** modular monolith, the platform leverages deterministic scoring combined with a reproducible, synthetic academic-risk predictive model.

> ⚠️ **Demonstration Notice:** All included student records are entirely synthetic. Public demo roles provide role-based UI previews and do not represent actual institutional authentication. The predictive model is strictly for demonstration purposes and is not validated for real students. Model outputs must not drive automated adverse decisions.

---

[Capabilities](#capabilities) · [Architecture & Workflow](#architecture-and-workflow) · [Quick Start](#quick-start) · [Verification](#verification) · [Documentation](#documentation)

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

The EduNex backend employs a modular monolith architecture, segregating data ingestion, analytics, model inference, and intervention management into distinct modules. **PostgreSQL** serves as the canonical system of record, while **Redis** facilitates optional caching and event-driven architecture. The React frontend maintains real-time synchronization via WebSockets.

```mermaid
---
title: EduNex System Architecture
---
flowchart TB
    %% Styling
    classDef dataLayer fill:#f8fafc,stroke:#94a3b8,stroke-width:2px,color:#0f172a,rx:10,ry:10
    classDef appLayer fill:#f0fdfa,stroke:#0d9488,stroke-width:2px,color:#134e4a,rx:10,ry:10
    classDef uiLayer fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#2e1065,rx:10,ry:10
    classDef optionalLayer fill:#ffffff,stroke:#cbd5e1,stroke-width:2px,stroke-dasharray: 5 5,color:#475569,rx:10,ry:10
    classDef dbLayer fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a

    subgraph DATA ["Data & Pipeline Layer"]
        direction LR
        sources[/"Synthetic CSVs"/]
        ingest[["Ingestion Pipeline"]]
        evidence[/"Canonical Evidence"/]
        sources -->|Validate & Deduplicate| ingest -->|Write| evidence
    end

    subgraph CORE ["Core Application Layer"]
        direction LR
        db[("PostgreSQL")]
        services{{"Domain Services"}}
        model(["ML Inference"])
        api[["FastAPI REST API"]]
        support{{"Intervention Engine"}}

        db <-->|Read/Write| services
        services -->|Predict| model
        services <--> api
        model --> api
        api <--> support
        support <-->|Audit Trail| db
    end

    subgraph UI ["Experience Layer"]
        direction LR
        client(("React UI Workspace"))
        staff(["Staff Review Workflow"])
        client <--> staff
    end

    subgraph ASYNC ["Real-Time & Caching Layer (Optional)"]
        direction LR
        redis[("Redis Cache/PubSub")]
        ws[["WebSocket Gateway"]]
        redis -.->|Publish| ws
    end

    %% Cross-layer integrations
    ingest -->|Idempotent Load| db
    evidence -->|Provenance Data| api
    api <-->|JSON / HTTP| client
    services -.->|Cache Data| redis
    support -.->|Invalidate & Notify| redis
    ws -.->|Live Updates| client

    %% Class Attachments
    class DATA dataLayer
    class CORE appLayer
    class UI uiLayer
    class ASYNC optionalLayer
    class db,redis dbLayer
```

*Solid arrows represent synchronous primary data flow and REST paths. Dashed arrows represent asynchronous cache operations and real-time WebSocket notifications.*

### Core Workflow

1. **Evidence Preparation:** Validate and deduplicate synthetic source records, generating canonical datasets and quality reports, and hydrating the PostgreSQL database.
2. **Assessment Generation:** Compute baseline success scores, calculate academic/placement risk levels, and evaluate segment criteria. Domain Services surface this data via the REST API.
3. **Predictive Analytics:** The Inference Engine leverages a trusted local ML artifact. If missing, the system gracefully falls back to deterministic scoring baselines.
4. **Intervention Orchestration:** Staff utilize the React UI to inspect evidence and orchestrate support. All status transitions are persisted with strict version concurrency checks and comprehensive audit logging.
5. **Real-Time Synchronization:** If Redis is provisioned, backend mutations broadcast cache-invalidation events to browser clients via WebSockets, ensuring seamless UI consistency without manual refreshes.

### Technology Stack

| Layer | Primary Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 7, React Router, TanStack Query |
| **Design System** | Tailwind CSS 4, Radix UI, Recharts, Lucide Icons, GSAP |
| **Backend API** | Python 3.12, FastAPI, Pydantic, Uvicorn |
| **Data Persistence** | PostgreSQL 16, SQLAlchemy 2.0, Alembic |
| **Data Science** | pandas, NumPy, scikit-learn |
| **Eventing** | Redis (Cache & Pub/Sub), WebSockets |
| **Quality Assurance** | pytest, Vitest, Playwright, axe-core |
| **Infrastructure** | Render Blueprint (Web Service, Background Workers, PostgreSQL, Redis) |

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
