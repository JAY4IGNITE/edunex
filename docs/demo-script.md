# Five-minute judge demonstration

Use the hosted synthetic demo only after confirming its Postgres database is available. The Render Free database expires 30 days after creation, so rehearse after the database and judging dates are known.

## 0:00–0:40 — Set the boundary

Open the landing page and state that the records and identities are synthetic. Choose **Demo Dean / Admin** and point out that the role selector is for product review, not real login.

## 0:40–1:30 — Read the campus picture

On the overview, change department/year/semester filters and apply them. Walk through student count, success score, attendance, engagement, risk distributions, and historical trends. Explain that periods with insufficient data are omitted rather than filled with zero.

## 1:30–2:20 — Inspect one student

Open a student from the priority queue. Show the Student 360 record, score domains, missing inputs, and explainable risk factors. Separate observed measurements from model associations; do not describe a risk band as a diagnosis or certainty.

## 2:20–3:25 — Show human-led support tracking

Review a suggested action, assign it to a synthetic staff role, and show the status and audit history. Complete only the synthetic example. If no follow-up assessment exists, explain that the result stays unavailable instead of reporting zero improvement.

## 3:25–4:10 — Compare stakeholder views

Switch to Faculty and show the department scope in the banner. Switch to Mentor and show the assigned synthetic caseload. Explain that the server applies those scopes before it returns records.

## 4:10–5:00 — Plan and close

Return to Admin overview. Change advisors, cases per week, and horizon in the capacity scenario. Explain that the larger of academic and placement high-risk counts is used because overlap is unknown; the result is a planning scenario, not a causal or staffing recommendation. Export a CSV or use print view, then close with the need for local validation before any real use.

## Evidence to keep ready

- `reports/model-metrics.json` and `MODEL_CARD.md` for the model result and limitations.
- `docs/phase-3-roles.md` and `backend/tests/test_auth_scope.py` for role-scope evidence.
- `docs/phase-4-analytics-planner.md` for capacity assumptions and CSV checks.
- `docs/phase-5-reliability.md` for current Render limitations.
