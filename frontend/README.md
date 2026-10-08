# CampusPulse AI — Phase 13 frontend

React, strict TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Recharts, GSAP, with adapted React Bits and Origin UI components. Phase 13 only; the backend is unchanged.

## Run locally

From the repository root, start the existing API with its existing PostgreSQL configuration:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to port 8000. `.env.example` documents `VITE_API_BASE_URL`: leave empty for the proxy, or set an origin (without `/api`) in `.env.local`. VITE variables are public browser configuration; never put secrets there. A separate production host needs same-origin `/api` routing or an explicitly configured API origin permitted by the existing backend CORS policy. Deployment is outside Phase 13.

## Routes

`/` and `/dashboard`, `/students`, `/students/:studentId`, `/risks`, `/segments`, `/insights`, `/data`.

## Verification

```powershell
npm test
npm run build
npm run test:browser
npm run test:browser:charts
```

The browser verification uses isolated headless system Chrome and local servers. `test:browser` verifies live pagination, filters, empty Overview, mobile navigation, loading, errors/retry, and Student 360. `test:browser:charts` uses explicit browser-only contract fixtures to check populated chart layout, exact values, reduced motion, and segment dialog pagination/focus. Screenshots and runtime findings go to ignored `verification/`. No fixture or fault injection is included in the application.

`npm run test:browser:live` exercises the full populated route sequence against the backend and can take many minutes. Frozen aggregate endpoints returned in roughly 173–343 seconds during the initial run, which later encountered network suspension. The local proxy permits ten minutes per request. Passing frontend tests does not resolve this backend latency limitation; see the Phase 13 report for measured results and remaining limits.

## API contract decisions

- Cohort state lives in URL parameters (`department`, `year`, `semester`); changing filters resets student pagination. Successive control changes merge against the latest requested URL. Each query key includes its actual cohort. Filtering runs on the server.
- Department accepts the exact recorded name because the backend has no filter-values endpoint. Year 1–5 and semester 1–10 follow its schema.
- Student lists return identity fields only. Each 10-row page is enriched through cached explanation and segment-membership endpoints. Missing assessments display retry actions instead of fabricated values.
- High-risk lists cover only the current student page. There is no cohort-wide risk search endpoint in the frozen backend.
- Segment endpoints return institution-wide data. Filtered card counts come from analytics distribution; detailed characteristics and member lists are explicitly institution-wide. Characteristics are fetched only when requested.
- No analytical formulas or thresholds are implemented in the frontend. Count totals, chart geometry, display percentages, and weight-to-percent formatting are presentation operations only.
- Historical lines are descriptive; gaps are null, not zero. Engagement uses the returned index, not a percentage. Each metric requires two available periods to draw a trend.
- Data schema endpoint serves the dataset registry. The UI preserves recorded candidate/planned statuses, verified mappings, and demonstration provenance. Domain coverage is accepted source-record counts, not invented unique-student coverage.
- Query stale time is five minutes; registry/provenance artifacts are thirty minutes and segment details fifteen minutes. Focus does not trigger a refetch. Heavy overview sections load progressively; already-returned overview distributions remain readable while the dedicated distribution endpoint runs.
- React's optional development StrictMode wrapper is omitted to avoid duplicate expensive backend GET work during development remounts. Route chunks use Suspense within the persistent shell.

## Structure

`src/app` routing; `pages` domain views; `components` shared cards/charts/tables/states/controls; `services/api` typed network boundary; `types` backend contracts; `hooks` filters/motion; `utils` display transforms; `test` unit and interaction checks.

See `THIRD_PARTY_NOTICES.md` for exact component sources and licenses. Full implementation and validation report: `../docs/phase-13-report.md`.
