# EduNex frontend redesign report

Date: 8 October 2026. Scope: the existing React frontend. This work remains local; nothing was deployed or pushed.

## Redesign summary

The complete application now shares a dark, restrained glass visual system and EduNex branding. The implementation retains the existing routes, typed API client, TanStack Query keys/caching, backend filters, score methods, risks, official segments, and detailed source records.

The redesign was preceded by an audit of every route, component, API call, chart, filter, loading/error/empty state, dependency, and existing test. Implementation was split into the shared shell/design system, analytical views, student/data views, and verification.

## Before → after

| Area | Before | After |
| --- | --- | --- |
| Identity | Light CampusPulse shell | Dark EduNex workspace, updated favicon and page titles |
| Navigation | Fixed expanded sidebar | 256px sidebar with persisted 80px collapse, route breadcrumbs, mobile navigation |
| Search | No global search or directory lookup | Ctrl+K / Command+K command palette and exact-ID student lookup |
| Overview | Six equally weighted metrics | Four primary metrics, score distribution centerpiece, dedicated risk summaries, historical and segment panels |
| Students | Desktop table at every width | Sticky desktop headers and complete structured mobile records |
| Student 360 | Numeric score and dense contribution table | Score ring, band label, modular risk summaries, domain contribution cards, seven icon-led histories |
| Insights | Sequential categories | Category filtering, grouped insight cards, comparisons and reported period evidence |
| Data | Light source/quality cards | Domain pipeline, seven coverage cards, clear validation outcomes and provenance |
| Consistency | Repeated light colors and small metadata | Central tokens, unified controls, semantic badges, chart palette and tooltips |

Before screenshots are in `frontend/verification/before-edunex/`. After screenshots are in `frontend/verification/after-edunex/`. Each directory contains full route captures; the after directory also includes viewport-only desktop/mobile captures. Screenshots using TEST IDs are explicitly isolated test fixtures, not production data. The application only renders API responses.

## Design system changes

`src/design-tokens.css` owns the palette and theme mapping: near-black background, translucent surfaces, opaque elevated surfaces, muted borders, primary/secondary text, violet accent, blue analytical accent, mint success, amber warning, and rose danger. Chart colors reference these same semantic tokens.

Spacing follows a compact 4px/8px rhythm. Page headings scale to 28–36px; card titles are 15–18px; key metrics use 28–44px with tabular numerals. Inter falls back to the locally available Segoe UI/system font stack. No remote font request or extra dependency was introduced.

The shared styles are separated into design tokens, shell styles, general component styles, detailed view styles, profile enhancements, and analytical view styles. Inline style values are limited to data-dependent chart/bar geometry and existing skeleton heights.

## Components created

| Component | Purpose |
| --- | --- |
| `GlassCard` | Reusable token-based glass surface with default, elevated, interactive, highlight, danger, and success variants |
| `Tooltip` | Accessible Radix tooltip wrapper, used for collapsed navigation and workspace controls |
| `CommandPalette` | Searchable destination list and exact-ID student navigation with keyboard support |
| `navigation.ts` | Shared destination metadata and correct active state for both `/` and `/dashboard` |
| `ScoreRing` | Actual reported score and band; no frontend thresholds or score calculation |
| `DomainIcon` | Consistent seven-domain Lucide mapping |
| `AnalyticsTooltip` | Shared readable dark chart tooltip |
| `SegmentDistribution` | Cohort counts already returned by the distribution API, with no new request |

## Components refactored

The shell, global filter presentation, shared metrics/risk badges, buttons, route skeleton, chart presentation, insight cards, student table, every page, score explanation, and source-history presentation were updated. Existing semantic HTML, meaningful error/empty states, retry controls, and Radix dialogs were retained.

The directory adds exact-ID lookup without fetching or searching the entire dataset. Rows continue to use links for keyboard navigation; pointer selection anywhere in a row opens the same profile. The decorative student identifier marker is excluded from the accessible name and does not alter the identifier text.

## Routes redesigned

- `/` and `/dashboard`: four API-backed KPIs, score distribution with the reported cohort average, academic/placement risk panels, selectable history, segment counts, and insight previews.
- `/students`: exact-ID lookup, cohort filters, bounded ten-record pagination, real score/risk/membership enrichment, compact desktop records and stacked mobile records.
- `/students/:studentId`: identity, reported score/band, independent assessment states, risk explanations, domain contribution values and weights, missing/excluded signals, and all seven source histories.
- `/risks`: labeled academic and placement distributions, assessment context, and the existing high-risk list explicitly scoped to the current ten-student page.
- `/segments`: all six API-defined groups, descriptions, criteria, counts/proportions, distinct restrained icons, and institution-wide characteristics/member dialogs.
- `/insights`: actual categories, report time/population, category controls, supporting metrics, comparison values, and reported historical evidence. No causal claims were introduced.
- `/data`: actual provenance, seven-domain pipeline/coverage, source registry statuses, accepted/rejected counts, full validation table, verified mappings and source rules.

## Animation system

Existing GSAP entrances remain short (380ms) and use its existing cleanup/reduced-motion handling. Shared timing tokens specify fast 160ms, normal 240ms, and complex 380ms transitions. Route entry uses an 8px fade/translation; dialogs enter over 220ms; charts animate only on appearance/update for 450–500ms. Buttons, interactive cards, navigation, disclosures, and skeleton shimmer have restrained feedback.

`prefers-reduced-motion` disables decorative motion, route/skeleton animation, hover translation and chart animation. There is no continuously animated dashboard background and no additional animation library.

## Glassmorphism system

The `.panel` system provides all shared surfaces with a single translucent background, thin border, restrained inset highlight/shadow, and consistent radius. `GlassCard` extends it with reusable variants. Blur is limited to glass cards, the header, mobile navigation and dialog overlays; chart tooltips/dialogs use a readable elevated dark surface. High-risk surfaces use quiet semantic color rather than bright alarming fills.

## Icon system

Lucide remains the single icon family with a consistent 1.7 stroke weight. Icons communicate navigation, domains, risks, search, resets, disclosure and directional actions. Risk badges include a shield symbol and a visible LOW/MEDIUM/HIGH label. Decorative icons are hidden from assistive technology where appropriate. No emoji UI icons were introduced.

## Button system

The existing button abstraction now uses the theme tokens and supports primary/default, secondary, ghost, outline, destructive, success and link variants; icon sizes; visible focus; disabled, active, hover and loading states. The loading indicator sets `aria-busy`. Destructive/success fills use contrasting dark text. Mobile controls generally provide at least 44px targets.

## Scrollbar design

Scrollbars are 6px wide/high with transparent tracks, subdued rounded gray thumbs, and a brighter hover state. Firefox uses `scrollbar-width: thin` and the same tokenized colors. Long tables scroll inside labeled, keyboard-focusable containers.

## Chart improvements

The score donut and historical area chart share semantic palette tokens, consistent axes/grid styling and a reusable dark tooltip. Legends, exact-value tables, metric units, null gaps, and minimum historical sample behavior remain intact. The score donut enables the Recharts accessibility layer. Score rings and directory bars use the **reported band** for semantic colors; they never infer a band from a numeric value.

The dashboard segment panel uses only returned counts. Bar lengths, display proportions and percent-formatting of weights are presentation operations; they do not replace analytical methods.

## Responsive improvements

All seven routes were captured at **1440, 1280, 1024, 768, 480, 390 and 320px**. All 49 route/viewport geometry checks passed with no document overflow and valid chart dimensions. Mobile filters have deliberate rows; navigation stays accessible in a bottom bar plus More dialog; directory rows become readable cards; profile sections and contribution cards stack; detailed source/quality tables remain contained.

Visual review covered each route and focused desktop/mobile captures, including the final mobile filter layout, directory, profile ring, segments, insights and data pipeline. New comparisons preserve the actual loading/empty/error behavior as well as populated layouts.

## Accessibility

The all-route scan passed **15 axe audits with zero violations**: seven routes at desktop/mobile plus the command palette. The chart/dialog and live interaction suites add checks for segment dialog focus, mobile navigation, safe errors and reduced motion. These scans are targeted WCAG 2 A/AA and WCAG 2.1 AA checks, not a claim of formal certification.

Keyboard tests verify Ctrl+K, arrow selection, Enter, Escape, focus trapping/restoration, collapsible navigation, links, dropdowns and disclosures. The `/dashboard` alias now correctly marks Overview active. Native labels, table roles, skip navigation, visible focus, text risk/band labels, and screen-reader chart/value descriptions remain available.

The Radix dialog/tooltip implementation follows its existing accessibility primitives; see [Radix Dialog documentation](https://www.radix-ui.com/primitives/docs/components/dialog). Chart keyboard semantics follow [Recharts accessibility guidance](https://github.com/recharts/recharts/blob/main/storybook/stories/API/Accessibility.mdx).

## Performance

No packages were added or upgraded. Route-level lazy loading, existing GSAP/Recharts chunks, query stale times, abort signals and progressive dashboard queries remain unchanged. Directory enrichment remains bounded to ten identities. The new dashboard segment visualization and insight category filter reuse fetched data.

Measured production bundle comparison (decimal kB):

| Asset | Before raw / gzip | After raw / gzip |
| --- | ---: | ---: |
| Main JavaScript | 418.27 / 136.33 kB | 462.44 / 151.51 kB |
| Lazy chart chunk | 386.97 / 113.01 kB | 387.78 / 113.16 kB |
| All JavaScript chunks | 918.37 / 293.23 kB | 977.21 / 313.84 kB |
| All CSS | 45.35 / 10.30 kB | 73.21 / 14.79 kB |

The shell/search/tooltip capability adds about **15.18 kB gzip to the main chunk**; all JavaScript grows about 7% gzip. Chart payload is essentially unchanged. This is a measured size tradeoff, not a claim of an improved Lighthouse/Core Web Vitals score. Bundle details are recorded in `frontend/verification/bundle-comparison.json`.

## Test results

| Check | Result |
| --- | --- |
| Frontend Vitest | **29/29 passed**, six suites (baseline: 25/25) |
| TypeScript | **PASS**, `npm run typecheck` and production build's `tsc --noEmit` |
| Production build | **PASS**, no build warning/error |
| Backend regression suite | **63/63 passed** on the final run; two existing dependency deprecation warnings |
| Live interaction Playwright suite | **PASS**: filters, pagination, Student 360, mobile menu, loading, retry, 404 |
| Chart/segment Playwright suite | **PASS**: responsive geometry, exact values/units, reduced motion, member pagination and focus |
| Redesign Playwright suite | **PASS**: seven routes, 49 viewport checks, command palette, lookups, disclosures and insight filtering |
| Extended populated live route suite | **FAIL — live Insights timeout** after 600,000ms; Data Integration, Students, Student Profile and Risks passed before the timeout |
| Healthy-page console errors/warnings | **0** in all four browser runs, including the partial extended live run |
| Automated accessibility | **PASS**, zero axe violations in the passing suites |
| Frontend whitespace/diff check | **PASS** |

Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`, `npm run test:browser:charts`, `npm run test:browser:redesign`, `npm run test:browser:live`, and `.venv/Scripts/python.exe -m pytest backend/tests -q`.

The first new shell tests were run before implementation and failed on the missing collapse/search behavior, then passed after implementation. The baseline production build and 42 baseline screenshot checks were preserved before the shared theme changed. Development hot reload interrupted an intermediate extended live run; the final attempt used the immutable production preview on port 4174.

The final extended run reached four populated routes with zero console errors/warnings and zero violations in all four axe audits. Its Computer Science / Year 2 / Semester 4 Insights request did not finish within the existing ten-minute wait, leaving the truthful loading skeleton visible. The run therefore failed before its remaining Segments and Overview checks. Those layouts and interactions passed the separate isolated-fixture suites; that does not establish a pass for the complete populated live sequence. Evidence is saved in `frontend/verification/browser-report.json` and `frontend/verification/failure.png`. No timeout was increased and no response was fabricated to turn this failure into a pass.

## Backend changes

**NONE by this redesign.** The API service client, response contracts, query helper, filter logic, scoring/risk/segmentation methods, database schema, and backend source were not changed by this task. Existing and concurrent backend/data/configuration edits in the shared workspace were preserved. The backend suite increased from 56 to 63 tests during that independent work; the final run passed all 63.

No deployment, push, fabricated production URL, analytics fallback, credentials, unsafe HTML or extra source-data generation was added.

## Remaining issues and intentional boundaries

- The frozen API supports exact student-ID lookup, not name/full-text search. No pretend search endpoint was added.
- High-risk lists remain scoped to the currently fetched student page; segment details remain institution-wide. Both limitations are visible in the UI.
- The aggregate score API provides no cohort-average band, so the overview does not fabricate one.
- **Live verification limitation:** the final populated Insights request exceeded 600 seconds. The full populated live regression sequence remains unverified beyond that point. Cold institutional aggregate/segment calls can take minutes; the redesign keeps truthful skeletons/error states and existing caching. Backend latency was not changed here.
- No notifications or account menu was invented because those features have no backing support. Workspace identity remains informational.
- The dark theme is the supported design target. No extra light-theme system was added.
- No deployment-host performance score or screen-reader certification was claimed. Two existing backend dependency deprecation warnings remain outside this frontend task.

## Files modified

- `frontend/README.md`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/public/favicon.svg`
- `frontend/scripts/verify-browser.mjs`
- `frontend/scripts/verify-charts.mjs`
- `frontend/scripts/verify-interactions.mjs`
- `frontend/src/components/cards/InsightCard.tsx`
- `frontend/src/components/cards/Shared.tsx`
- `frontend/src/components/charts/Charts.tsx`
- `frontend/src/components/filters/FilterBar.tsx`
- `frontend/src/components/layout/Shell.tsx`
- `frontend/src/components/skeletons/index.tsx`
- `frontend/src/components/tables/StudentTable.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/detail-styles.css`
- `frontend/src/pages/Dashboard/index.tsx`
- `frontend/src/pages/DataIntegration/index.tsx`
- `frontend/src/pages/Insights/index.tsx`
- `frontend/src/pages/Risks/index.tsx`
- `frontend/src/pages/Segments/index.tsx`
- `frontend/src/pages/StudentProfile/DomainHistory.tsx`
- `frontend/src/pages/StudentProfile/ExplanationPanels.tsx`
- `frontend/src/pages/StudentProfile/index.tsx`
- `frontend/src/pages/Students/index.tsx`
- `frontend/src/styles.css`
- `frontend/vite.config.ts`

## Files created

- `frontend/scripts/browser-fixtures.mjs`
- `frontend/scripts/redesign-fixtures.mjs`
- `frontend/scripts/verify-redesign.mjs`
- `frontend/src/analytics.css`
- `frontend/src/components/analytics/DomainIcon.tsx`
- `frontend/src/components/analytics/ScoreRing.tsx`
- `frontend/src/components/charts/AnalyticsTooltip.tsx`
- `frontend/src/components/charts/SegmentDistribution.tsx`
- `frontend/src/components/layout/CommandPalette.tsx`
- `frontend/src/components/layout/navigation.ts`
- `frontend/src/components/ui/glass-card.tsx`
- `frontend/src/components/ui/tooltip.tsx`
- `frontend/src/design-tokens.css`
- `frontend/src/profile-enhancements.css`
- `frontend/src/shell.css`
- `frontend/src/test/shell.test.tsx`
- `docs/edunex-redesign-report.md`

Ignored verification artifacts include before/after screenshots and source/build snapshots, Playwright JSON reports, bundle comparison, and local server logs. They are not imported by application code.

