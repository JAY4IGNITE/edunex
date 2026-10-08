# Phase 13 implementation plan

The user's Phase 13 brief supersedes the initial Phase 0–1 gate documents. Backend analytical methods and files are frozen. No later phase is authorized.

## Inspection

`frontend/` contains only a placeholder README. There is no package.json, Vite config, Tailwind config, shadcn config, source, or frontend test suite. The workspace has no `.git` directory. Existing backend schemas and endpoint implementations are the contract.

## Slices

1. Strict React/TypeScript, Vite/Tailwind/shadcn foundation; typed HTTP client, URL cohort filters, cancellation and contract tests.
2. Responsive shell, reusable loading/error/empty states, overview and Recharts descriptive trends.
3. Paginated students, Student 360 and risk intelligence using per-student backend outputs.
4. Segments, grouped insights and data integration/provenance.
5. Phase 13 validation: tests, production build, backend pytest, every route, console/network, filters, responsive layouts and reduced motion. Final report and stop.

## Contract constraints

- `/students` is an array of identity fields with skip/limit, not an analytical table. Enrich only the visible page via cached per-student APIs. Do not download the population for client-side cohort filtering.
- Segment endpoints are institution-wide. Cohort segment counts come from `/analytics/distribution`; institution-level characteristics are explicitly scoped. No misleading query parameters on endpoints that ignore them.
- There is no server high-risk student search. Any high-risk list must state its page scope; no claim of cohort-wide completeness.
- No filter metadata endpoint exists. Department is an exact-match text filter; year/semester choices use Pydantic bounds.
- Data endpoints serve registry/mapping/quality/provenance artifacts, not a canonical field-schema endpoint or real-time ingestion status. Display them as returned, including planned/candidate status.
- Demonstration provenance must remain visible. Record counts are distinct from student population counts.
