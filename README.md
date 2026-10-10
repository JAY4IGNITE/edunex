<div align="center">
  <h1>EduNex 🎓</h1>
  <p><strong>Smart Campus Analytics for Student Success</strong></p>

  [![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/release/python-3120/)
  [![Node 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
  [![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
</div>

<br />

EduNex is a comprehensive, open-source student-success analytics platform designed to bring academic, attendance, LMS, engagement, placement, skills, and feedback signals into a unified cohort dashboard and a comprehensive 360-degree student view. 

It empowers university staff and educators to inspect transparent risk explanations, review human-authored support recommendations, and track interventions through an audited workflow—ultimately helping institutions proactively identify and support at-risk students.

> **⚠️ Data Boundary & Synthetic Demo**  
> The included dataset is strictly synthetic and generated for demonstration purposes. Demo identities are public role previews, not production authentication. Do not connect real student records or use this application to make automated adverse decisions.

---

## ✨ Key Features

- **Holistic Student Success Score**: A dynamic seven-domain scoring engine that recalculates and renormalizes weights intelligently when source domains are unavailable.
- **Actionable Risk Modeling**: Separate academic and placement risk views, equipped with transparent explainability, historical summaries, and cohort filtering capabilities.
- **Predictive Analytics**: A synthetic, time-forward academic-risk model providing rerunnable evidence reports. See the [Model Card](MODEL_CARD.md) for architecture, metrics, and limitations.
- **Intervention Lifecycle Management**: Includes a priority queue, suggested support actions, a staff-reviewed intervention tracker, version checks, and comprehensive audit history.
- **Role-based Access Control (RBAC)**: Includes specialized demo views for Admin, Faculty, Mentor, and Counselors. The backend API enforces strict departmental and seeded-assignment scoping.
- **Capacity Planning**: A built-in cohort capacity scenario builder with editable staffing assumptions, CSV data export, and print-ready reporting views.

## 🛠️ Technology Stack

**Frontend:**
- React 18, TypeScript, Vite
- TanStack Query (React Query)
- React Router DOM
- Custom Vanilla CSS Design System

**Backend:**
- Python 3.12+, FastAPI, Uvicorn
- PostgreSQL 16+, SQLAlchemy, Alembic (Migrations)
- Scikit-learn (Machine Learning Pipeline)
- Pytest (Backend Testing)

---

## 🚀 Getting Started

### Prerequisites
- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/)

### 1. Database & Environment Setup
From the repository root, create a PostgreSQL database. Copy `.env.example` to `.env`, and set `DATABASE_URL` to point to your local database using the `postgresql+psycopg://` dialect. Keep `ENVIRONMENT=development` for local testing.

### 2. Backend Initialization
In your terminal, set up the Python environment, run the migrations, ingest the synthetic demo data, and start the API server:

```powershell
# Create and activate virtual environment
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install -r backend/requirements.txt

# Run migrations and data ingestion
python -m alembic -c backend/alembic.ini upgrade head
python -m backend.scripts.run_ingestion

# Start the FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Initialization
In a separate terminal, install the Node modules and start the Vite development server:

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. 
*(Note: To regenerate the fixed-seed source files, run `python backend/scripts/generate_demo.py` and then rerun the ingestion script.)*

---

## 🧪 Testing & Verification

The repository maintains strict test coverage ensuring production readiness.

**Backend Tests (Pytest):**
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp=.phase-work/pytest
```

**Frontend Tests & Typechecking:**
```powershell
npm test --prefix frontend -- --pool=vmThreads --maxWorkers=1
npm run typecheck --prefix frontend
npm run build --prefix frontend
```
*(The automated CI pipeline runs integration tests against a fresh PostgreSQL database instance.)*

---

## ☁️ Deployment Notes

The infrastructure is defined via `render.yaml`, outlining the static frontend, API, Redis cache, and Postgres service. 
- On Render deployments, the API start command automatically executes Alembic migrations and idempotent synthetic ingestion before spinning up Uvicorn. 
- **Production Security:** For production builds, you **must** set the `EDUNEX_SESSION_SECRET` environment variable to a shared random value of at least 32 characters in your deployment dashboard. *Never commit this secret.*
- Note for free tiers: Hosted PostgreSQL databases may sleep or expire depending on the provider tier. Always backup necessary synthetic configurations.

---

## ⚖️ Responsible Use & Evidence

- **[Model Card](MODEL_CARD.md)**: Details the academic risk model's outcome definition, data splits, metrics, calibration, and critical limitations.
- **Authentication**: The public role selector used in this codebase is not a real account system. It is designed to be replaced with institutional identity management (SSO), rigorous authorization, user consent forms, monitoring, and data retention controls before any real-world production data is utilized.
