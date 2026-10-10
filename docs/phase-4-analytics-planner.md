# Phase 4: cohort analytics and support capacity planning

The dashboard's cohort filters feed overview metrics, risk distributions, and historical success, attendance, and engagement trends. This phase adds an adjustable support-capacity scenario to the selected cohort and a CSV/print snapshot action.

The scenario asks for advisor count, cases per advisor per week, and planning weeks. It estimates the high-risk caseload with the larger of the academic-risk and placement-risk counts because those groups may overlap and student-level overlap is not present in the aggregate response. It shows capacity, uncovered cases, and estimated coverage. The page labels these values as planning assumptions and does not present them as observed workload or prediction.

The CSV includes cohort filters, overview metrics, risk counts, editable scenario assumptions, and available trend periods. Values are quoted and escaped; cells beginning with spreadsheet formula markers are prefixed to reduce formula-injection risk. The print action hides navigation and controls for a cleaner dashboard printout.

Verification:

```powershell
cd frontend
npm test -- --pool=vmThreads --maxWorkers=1
npm run typecheck
npm run build
```

The frontend suite passes all 52 tests, including cases for overlap handling, capacity shortfall, CSV quoting, and formula safety. Typecheck and production build pass. A live visual check reached the local Admin dashboard, but metric cards remained in loading state because the backend's configured Postgres query was waiting for a connection; the dashboard data-backed scenario could not be visually confirmed in this environment.
