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
    %% Styling based on the image
    classDef staff fill:#eef2ff,stroke:#6366f1,stroke-width:1px
    classDef app fill:#dbeafe,stroke:#3b82f6,stroke-width:1px
    classDef page fill:#bfdbfe,stroke:#2563eb,stroke-width:1px
    classDef api fill:#fef3c7,stroke:#d97706,stroke-width:1px
    classDef ep fill:#fde68a,stroke:#d97706,stroke-width:1px
    classDef analytics fill:#dcfce7,stroke:#16a34a,stroke-width:1px
    classDef support fill:#fee2e2,stroke:#dc2626,stroke-width:1px
    classDef data fill:#e0e7ff,stroke:#4f46e5,stroke-width:1px
    
    user((University staff))
    class user staff
    
    subgraph SE ["Staff experience"]
        direction TB
        appNode["EduNex web app<br>[App.tsx]"]
        class appNode app
        
        subgraph pages [" "]
            direction LR
            dash["Cohort dashboard<br>[index.tsx]"]
            student["Student views<br>[index.tsx]"]
            risk["Risk and priority views<br>[index.tsx]"]
            insights["Insights and segments<br>[index.tsx]"]
            tracker["Intervention tracker<br>[index.tsx]"]
            integration["Data integration view<br>[index.tsx]"]
            class dash,student,risk,insights,tracker,integration page
        end
        
        appNode -- routes to --> dash
        appNode -- routes to --> student
        appNode -- routes to --> risk
        appNode -- routes to --> insights
        appNode -- routes to --> tracker
        appNode -- routes to --> integration
    end
    
    user -- uses --> appNode
    
    subgraph API ["API and access"]
        direction TB
        fastapi["FastAPI application<br>[main.py]"]
        class fastapi api
        
        subgraph eps [" "]
            direction LR
            ep_student["Student endpoints<br>[students.py]"]
            ep_risk["Risk and scoring endpoints<br>[academic_risk.py]"]
            ep_analytics["Analytics endpoints<br>[analytics.py]"]
            ep_auth["Demo identity and access scope<br>[demo_auth.py]"]
            ep_interv["Intervention endpoints<br>[interventions.py]"]
            ep_ws["WebSocket endpoints<br>[websockets.py]"]
            class ep_student,ep_risk,ep_analytics,ep_auth,ep_interv,ep_ws ep
        end
        
        fastapi -- registers --> ep_student
        fastapi -- registers --> ep_risk
        fastapi -- registers --> ep_analytics
        fastapi -- authenticates requests --> ep_auth
        fastapi -- registers --> ep_interv
        fastapi -- registers --> ep_ws
    end
    
    dash -. loads cohort data .-> fastapi
    student -. loads student view .-> fastapi
    risk -. loads risk results .-> fastapi
    insights -. loads insights .-> fastapi
    tracker -. requests data .-> fastapi
    tracker -. manages interventions .-> fastapi
    
    subgraph SA ["Student analytics"]
        direction TB
        risk_pred["Academic risk prediction"]
        risk_service["Academic and placement risk<br>[academic_risk.py]"]
        insight_service["Insights and segmentation<br>[insight.py]"]
        class risk_pred,risk_service,insight_service analytics
        
        subgraph ARP [" "]
            direction TB
            ml_inf["Model inference<br>[inference.py]"]
            risk_exp["Risk explanations<br>[explanation.py]"]
            student_360["Student 360 and scoring<br>[student_360.py]"]
            temp_feat["Temporal feature assembly<br>[temporal_aggregator.py]"]
            class ml_inf,risk_exp,student_360,temp_feat analytics
            
            risk_pred -- predicts risk --> ml_inf
            risk_pred -- uses baseline --> risk_exp
            risk_pred -- loads profile --> student_360
            ml_inf -- uses feature contract --> temp_feat
            risk_pred -- extracts features --> temp_feat
        end
    end
    
    ep_student -- requests prediction --> risk_pred
    ep_risk -- calls --> risk_service
    ep_analytics -- calls --> insight_service
    
    subgraph SO ["Support operations"]
        direction LR
        interv_life["Intervention lifecycle<br>[interventions.py]"]
        rt_pub["Realtime event publishing<br>[pubsub.py]"]
        class interv_life,rt_pub support
    end
    
    ep_interv -- calls --> interv_life
    ep_ws -- uses --> rt_pub
    
    subgraph DF ["Data foundation"]
        direction TB
        ingestion["Domain data ingestion<br>[ingestion.py]"]
        domain_rec["Student domain records<br>[canonical.py]"]
        canon_val["Canonical validation schemas<br>[canonical.py]"]
        redis_cache["Redis cache and messaging<br>[cache.py]"]
        pg[(PostgreSQL)]
        class ingestion,domain_rec,canon_val,redis_cache,pg data
        
        ingestion -- validates records --> canon_val
        ingestion -- persists domain records --> domain_rec
        domain_rec --> pg
    end
    
    temp_feat -- reads records --> pg
    student_360 -- reads and writes scores --> pg
    insight_service -- queries cohort data --> pg
    interv_life -- stores audit workflow --> pg
    interv_life -- reads student data --> pg
    rt_pub -- uses messaging --> redis_cache
    ep_ws -- connects at startup --> redis_cache

    %% Click interactions
    click appNode "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/app/App.tsx" "View App.tsx"
    click dash "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/Dashboard/index.tsx" "View Cohort dashboard"
    click student "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/StudentProfile/index.tsx" "View Student views"
    click risk "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/Priority/index.tsx" "View Risk and priority views"
    click insights "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/Insights/index.tsx" "View Insights and segments"
    click tracker "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/Interventions/index.tsx" "View Intervention tracker"
    click integration "https://github.com/JAY4IGNITE/edunex/blob/main/frontend/src/pages/DataIntegration/index.tsx" "View Data integration view"
    
    click fastapi "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/main.py" "View FastAPI application"
    click ep_student "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/api/endpoints/students.py" "View Student endpoints"
    click ep_risk "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/api/endpoints/academic_risk.py" "View Risk and scoring endpoints"
    click ep_analytics "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/api/endpoints/analytics.py" "View Analytics endpoints"
    click ep_auth "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/core/demo_auth.py" "View Demo identity and access scope"
    click ep_interv "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/api/endpoints/interventions.py" "View Intervention endpoints"
    click ep_ws "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/api/endpoints/websockets.py" "View WebSocket endpoints"
    
    click risk_service "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/academic_risk.py" "View Academic and placement risk"
    click insight_service "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/insight.py" "View Insights and segmentation"
    click ml_inf "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/ml/inference.py" "View Model inference"
    click risk_exp "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/explanation.py" "View Risk explanations"
    click student_360 "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/student_360.py" "View Student 360 and scoring"
    click temp_feat "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/ml/features/temporal_aggregator.py" "View Temporal feature assembly"
    
    click interv_life "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/interventions.py" "View Intervention lifecycle"
    click rt_pub "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/pubsub.py" "View Realtime event publishing"
    
    click ingestion "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/ingestion.py" "View Domain data ingestion"
    click domain_rec "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/schemas/canonical.py" "View Student domain records"
    click canon_val "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/schemas/canonical.py" "View Canonical validation schemas"
    click redis_cache "https://github.com/JAY4IGNITE/edunex/blob/main/backend/app/services/cache.py" "View Redis cache and messaging"
```

*The diagram above features clickable nodes that directly navigate to their corresponding source files.*

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

## 🚀 Quick Start

### Prerequisites

Ensure your environment matches the CI pipeline:
- **Python 3.12**
- **Node.js 22**
- **PostgreSQL 16**
*(Note: Redis is optional for local development)*

The commands below use PowerShell from the repository root. On macOS or Linux, initialize the environment using `python3.12 -m venv .venv` and activate it with `source .venv/bin/activate`.

### 1. Database & Environment Configuration

Create a local PostgreSQL database named `edunex` with a user permitted to create tables:

```powershell
createdb -U postgres edunex
Copy-Item .env.example .env
```

If `.env` already exists, edit it instead of copying. Update with your local database credentials:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:your_password@127.0.0.1:5432/edunex
FRONTEND_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
ENVIRONMENT=development
```

*(Leave `REDIS_URL` empty for a database-only setup, or set your Redis connection URL to enable caching and WebSockets).*

### 2. Backend Initialization

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
> **Note:** The ingestion script loads the synthetic dataset and computes baseline assessments. It gracefully skips existing canonical datasets and is not designed to indiscriminately overwrite existing source records.

### 3. Frontend Startup

In a new terminal at the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

You can now explore the [EduNex UI](http://127.0.0.1:5173) using the demo role selector. 
- **API Health:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Configuration Reference

| Environment Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection for the API, migrations, and ingestion. |
| `FRONTEND_ORIGIN` | Comma-separated browser origins explicitly permitted by the backend. |
| `ENVIRONMENT` | Use `development` locally; other values enforce secure session cookies. |
| `REDIS_URL` | *(Optional)* Redis connection for distributed caching and events. |
| `EDUNEX_SESSION_SECRET` | 32+ character cryptographic secret for session signing in hosted environments. |
| `EDUNEX_MODEL_PATH` | *(Optional)* Absolute path to a trusted v2 ML model artifact. |
| `VITE_API_BASE_URL` | Public API origin (excluding `/api`). Leave empty for local Vite proxies. |
| `EDUNEX_API_PROXY_TARGET` | Server-side override for Vite's local API proxy target. |

---

## 🧪 Verification & Testing

Run the test suites from the root directory with the Python environment active. 
> **Note:** Backend integration tests require a populated, disposable PostgreSQL database specified via `DATABASE_URL`.

```powershell
# Backend (Pytest)
python -m pytest backend/tests -q --basetemp=.phase-work/pytest

# Frontend (Vitest & TS)
npm test --prefix frontend -- --pool=vmThreads --maxWorkers=1
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

### End-to-End Demo Journey
Keep the API and frontend running, install the headless browser, and execute the Playwright suite:

```powershell
cd frontend
npx playwright install chromium
npm run test:judge
```

Our robust [GitHub Actions CI](.github/workflows/ci.yml) provisions the database, handles migrations/seeding, executes full-stack checks, and compiles browser accessibility evidence.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app/api/           # REST endpoints and WebSocket routes
│   ├── app/core/          # Global config, DB sessions, and auth scopes
│   ├── app/models/        # SQLAlchemy ORM definitions
│   ├── app/schemas/       # Pydantic payloads and validation logic
│   ├── app/services/      # Business logic: analytics, workflows, caching
│   ├── app/ml/            # ML feature extraction and inference engine
│   ├── alembic/           # Relational schema migrations
│   ├── scripts/           # Ingestion pipelines and synthetic data gen
│   └── tests/             # Backend unit and integration tests
├── frontend/
│   ├── src/               # React UI, API clients, and Tailwind styling
│   └── scripts/           # Build and verification utilities
├── data/                  # Source CSVs, canonical records, and provenance
├── docs/                  # Architectural and domain documentation
├── reports/               # ML evaluation metrics
├── scripts/               # ML training utilities
├── render.yaml            # Render deployment blueprint
└── MODEL_CARD.md          # Model protocol, limitations, and evidence
```

---

## ☁️ Deployment

EduNex utilizes a [Render blueprint](render.yaml) that provisions a static frontend, a Python API service, a Redis instance, and a PostgreSQL database. Upon deployment, the API automatically executes Alembic migrations and data ingestion before launching Uvicorn.

Ensure `EDUNEX_SESSION_SECRET` is securely configured. Validate CORS origins if using custom domains. This blueprint is intended for demonstration; evaluate provider plan limits before relying on it for high-availability production workloads.

---

## 🛡️ Responsible Use

The public demo role selector is intended strictly for exploring synthetic records. Missing sessions gracefully default to a demo Admin identity. **Do not use this authentication mechanism in production environments.**

Before analyzing real student data:
1. Implement robust institutional Single Sign-On (SSO) and authorization.
2. Establish strict data governance and retention policies.
3. Validate analytical models prospectively against institutional baselines.

*Synthetic performance does not guarantee real-world fairness or validity. Staff must retain ultimate responsibility for all support and intervention decisions.*

---

## 📚 Documentation

| Guide | Description |
| :--- | :--- |
| [Product Requirements](docs/PRD.md) | Platform context, scope, and technical requirements. |
| [Data Dictionary](docs/data-dictionary.md) | Field definitions and ingestion constraints. |
| [Student 360 & Scoring](docs/student-success-score.md) | Profile aggregations, weights, and missing-data handlers. |
| [Explainability](docs/explainability.md) | Academic and placement risk assessments and interpretability. |
| [Insights](docs/insights.md) | Cohort segmentation logic and analytical insights. |
| [Model Card](MODEL_CARD.md) | Predictive model protocol, evidence, and known limitations. |
| [Demo Walkthrough](docs/demo-script.md) | Recommended pathways for platform demonstration. |

---

## 🤝 Contributing

We welcome contributions! Please keep your PRs focused and ensure you update corresponding documentation. Utilize synthetic fixtures, provide reproducible steps, and include verification evidence with your pull requests.

## 📄 License

EduNex is open-source under the [MIT License](LICENSE). Third-party frontend component attributions are available in [THIRD_PARTY_NOTICES.md](frontend/THIRD_PARTY_NOTICES.md).
