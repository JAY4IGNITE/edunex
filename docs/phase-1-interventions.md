# Phase 1 — recommendations, reviewed actions and observed outcomes

Implemented a read-only priority engine using existing seven-domain scoring and risk explanations. Each suggestion records its driver values, owner role, urgency and qualitative impact. Queue filters support department, academic year-of-study, semester, risk family and segment; ties use student ID.

Priority = maximum available risk / 100 × (1 + positive CGPA decline / 10) × unaddressed available drivers. Assigned/In Progress actions cover their drivers. Missing history uses a neutral decline multiplier. This score is a support-planning heuristic, not a treatment-effect estimate.

New intervention/audit tables preserve Recommended → Assigned → In Progress → Completed transitions and reason-required dismissal. Assignment requires a demo staff identity and due date. Optimistic versions reject stale updates. Deletion is audited and limited to unassigned recommendations. Completion preserves before/after source snapshots; no later assessment means outcome unavailable. Historical backfill alone does not count as improvement.

Files: `backend/app/services/support_analysis.py`, `interventions.py`, `models/intervention.py`, `schemas/intervention.py`, `api/endpoints/interventions.py`, migration `4a7201_support_interventions.py`; frontend Priority/Interventions pages, Student 360 RecommendationsPanel/InterventionCard, API client, navigation and filter reset. Risk/engagement record selection now consistently uses academic year then semester, preserving all weights.

## Verify from repository root

```powershell
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp=.phase-work/pytest-phase1-final
npm test --prefix frontend
npm run build --prefix frontend
```

Start the API at port 8012 and frontend with `EDUNEX_API_PROXY_TARGET=http://127.0.0.1:8012`, port 5175. Open `/priority`, review a student, select Review and assign, Assign, Start, Complete; inspect `/interventions?status=Completed`. Automated browser check (creates synthetic demo actions): `cd frontend; node scripts/verify-support.mjs`. Optional `EDUNEX_TEST_BASE_URL` overrides the preview URL. Evidence is saved under `.phase-work/support-browser`.

Verified browser flow: priority → student → review → assign → start → complete → tracker; responsive widths 1440/768/390. Frontend: 48 passing tests, type-check and production build passed. Backend: 92 passing tests (three existing dependency/mock warnings).

## Remaining risks handled in following phases

- Demo actor/assignee identities are placeholders until Phase 3 server-side role enforcement; do not describe this intermediate checkpoint as authenticated.
- Aggregate priority calculation scans scoped synthetic records in batches. Phase 5 addresses caching and performance.
- Free Render Postgres currently expires 30 days after creation, with a subsequent 14-day upgrade grace period. Judging date and database creation date were not supplied, so survival through judging cannot be confirmed. Source checked 2026-10-09: https://render.com/docs/free. Phase 5 documents a durable deployment and reseeding procedure.
- Synthetic observed changes are not proof that the intervention caused an improvement.
