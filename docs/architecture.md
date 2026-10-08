# CampusPulse AI Architecture

## Architectural style

Modular monolith for hackathon speed, clarity and deployability.

## Flow

Source
→ Ingestion
→ Schema Validation
→ Cleaning
→ Standardization
→ Identity Validation
→ Temporal Validation
→ Data Quality Report
→ Canonical Dataset
→ Student 360
→ Analytics
→ API
→ Dashboard

## Backend

- FastAPI
- Python
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- pandas / NumPy
- scikit-learn where useful

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Recharts
- Zod

## Planned domain tables

students
academic_records
attendance_records
lms_records
engagement_records
placement_records
skill_records
feedback_records

Supporting tables:

data_sources
data_ingestion_runs
data_quality_reports
data_provenance
student_success_scores
academic_risk_scores
placement_risk_scores
student_segments
student_segment_memberships

Analytical view:

student_360_view

Avoid an oversized single student table.
