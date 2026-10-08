# EduNex frontend

EduNex is the student analytics and success workspace built with React, strict TypeScript, Vite, TanStack Query, Recharts, Lucide, Radix UI, and GSAP. The light and dark visual systems preserve the existing backend contracts, analytical methods, filters, and source records.

## Run locally

From the repository root, start the existing API using its configured database:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` and WebSocket `/ws` to port 8000. Set the server-only `EDUNEX_API_PROXY_TARGET` when using a different local API port (for example, `http://127.0.0.1:8001`). `.env.example` documents `VITE_API_BASE_URL`: leave it empty for the local proxy or set an API origin without `/api`. Vite environment variables are public browser configuration; never put secrets in them.

## Routes and navigation

`/` and `/dashboard`, `/students`, `/students/:studentId`, `/risks`, `/segments`, `/insights`, `/data`.

The desktop sidebar collapses from 256px to 80px and remembers the preference when local storage is available. Tablet and mobile use bottom navigation and an accessible More dialog. Ctrl+K / Command+K opens navigation search. Type a destination or an exact student ID; arrow keys select, Enter opens, and Escape closes. The student directory also offers direct ID lookup. The frozen API has no name-search endpoint.

## Appearance

The sun/moon button in the header switches light and dark themes at every screen size. On first use the interface follows the system appearance; an explicit choice is stored under `edunex-theme`, survives reloads, and synchronizes between tabs. Storage restrictions do not prevent switching. `public/theme.js` applies the choice before the application paints; `useTheme` maintains the browser color and system preference listener. All visual colors, including chart and dialog colors, are semantic tokens.

## Design system

- `src/design-tokens.css`: colors, surfaces, borders, chart palette, typography, radii, and motion timing.
- `src/shell.css`: workspace shell, command palette, and tooltips.
- `src/styles.css`: shared cards, controls, charts, states, responsive layout, and reduced motion.
- `src/detail-styles.css`, `src/profile-enhancements.css`, `src/analytics.css`: domain view layouts.
- `GlassCard`: default, elevated, interactive, highlight, danger, and success variants. Existing `.panel` surfaces share the same tokens.
- `Button`: primary/default, secondary, ghost, outline, destructive, success, link, icon sizes, and loading state.
- `ScoreRing`, `DomainIcon`, `AnalyticsTooltip`, and `SegmentDistribution`: shared analytical presentation without frontend scoring formulas.

No new dependency was installed for the redesign. The existing fonts fall back from Inter to Segoe UI/system UI without external font requests.

## Verification

With the frontend and backend running:

```powershell
npm test
npm run typecheck
npm run build
npm run test:browser
npm run test:browser:charts
npm run test:browser:redesign
npm run test:browser:redesign -- --light
node scripts/verify-realtime.mjs
npm run test:browser:live
```

- Unit and interaction tests are scoped to `src/test` so archived source snapshots are never picked up as duplicate tests.
- `test:browser` verifies live pagination, cohort filtering, empty Overview, mobile navigation, Student 360, loading, safe errors/retry, and missing student records.
- `test:browser:charts` uses isolated browser contract fixtures to verify chart values, units, reduced motion, and segment dialog member pagination/focus.
- `test:browser:redesign` verifies dark mode; add `-- --light` for light mode. It uses browser-only contract fixtures for every route at 1440, 1280, 1024, 768, 480, 390, and 320px. It records screenshots, document overflow, chart geometry, axe scans at desktop/mobile, console output, navigation, exact-ID lookup, command-palette keyboard behavior, and all seven source-history disclosures.
- `test:browser:live` exercises the full populated route sequence against the API. Aggregate and institution-wide segment endpoints can take several minutes on a cold backend; the existing proxy and this suite allow ten minutes per aggregate request.

The redesign and live interaction scripts accept `EDUNEX_TEST_BASE_URL` for an alternate local preview. `verify-realtime.mjs` confirms a real WebSocket handshake through the frontend proxy. Browser scripts use isolated headless system Chrome. Their screenshots and reports are written to ignored `verification/`. Contract fixtures and fault injection exist only in the test browser; the application never imports them or falls back to fabricated data. An immutable pre-redesign build and its screenshots are retained in `verification/before-edunex/` for local comparison.

## API contract decisions

- Cohort state lives in URL parameters (`department`, `year`, `semester`); changing filters resets student pagination. Successive control changes merge against the latest requested URL. Each query key includes its actual cohort. Filtering runs on the server.
- Department accepts the exact recorded name because there is no filter-values endpoint. Year 1–5 and semester 1–10 follow the existing schema.
- The identity list returns ten records per page and no names, scores, or risks. Each visible page is enriched through cached explanation and segment-membership endpoints; missing assessments show retry actions.
- High-risk lists cover only the current student page. There is no cohort-wide risk search endpoint.
- Segment definitions and details are institution-wide. Filtered card counts come from analytics distribution; detail scope remains explicit, and details load only when opened.
- The frontend does not calculate scores, risk thresholds, or segment membership. Count totals, bar lengths, proportions, and weight-to-percent formatting are presentation only.
- Student bands come from the score API. The cohort average has no returned band and displays no invented classification.
- Historical gaps remain null, not zero. Engagement displays its reported index. A chart needs at least two available periods.
- Dataset registry statuses, provenance, ingestion timestamps, and quality outcomes remain as reported. Coverage counts represent accepted source records, not unique student coverage.
- Five-minute query caching, thirty-minute registry/provenance caching, fifteen-minute segment detail caching, abort signals, and progressive dashboard requests are preserved. Focus does not refetch.
- React's optional development StrictMode wrapper remains omitted to avoid duplicate expensive backend GET work during remounts. Route chunks load inside the persistent shell.

See `THIRD_PARTY_NOTICES.md` for component sources and licenses. See `UI_VERIFICATION.md` for the latest frontend fixes, theme behavior, verification results, and remaining limits.
