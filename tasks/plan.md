# EduNex end-to-end student support plan

User contract: the attached eight-phase prompt; execute phases 0–7 sequentially without approval checkpoints. Preserve seven-domain weights and renormalization, existing routes and synthetic-only data. Suggestions always require a person to act.

## Build order and acceptance

0. Audit: enumerate routes/models/pages/tests; run baseline checks and local app. Evidence in docs/phase-0-audit.md and repository-inventory.json.
1. Interventions: pure driver-backed recommendations and priority formula; validated persistent state machine with optimistic versioning and append-only audit; before/after observations; queue, profile actions and tracker. Verify rule, missing-data, ordering, transitions and API tests plus browser flow.
2. Model: fixed-seed, distinct train/validation/test groups, temporal outcomes, artifact/report hashes, calibration and deterministic baseline. Keep inference contract; support missing-artifact fallback. Verify rerunnable training, leakage checks and model panel. No metric without executed evidence.
3. Roles: seeded synthetic identities, signed demo session and server-side department/assignment filters on all data paths; one-click role choices. Verify cross-role access failures and role-sensitive caches.
4. Optimize: computed scoped KPIs/trends, resource allocation with an explicit risk-priority proxy (not predicted causal reduction), what-if recomputation, CSV and print summary. Verify calculations and edge cases.
5. Reliability: cold-start health gate/retry, idempotent seeding/migrations, free-tier deployment and migration instructions, cache invalidation, pagination/indexes, WebGL fallback/lazy chunks, accessibility and measured Lighthouse output.
6. Evidence: correct README commands exercised in a clean checkout; model card, compliance mapping, screenshots, demo script and pitch outline. Distinguish observed associations from causal effects; document unknown judging/DB creation dates.
7. Gates: deterministic isolated backend tests, frontend tests/build, full Playwright judge journey, CI including lint/typecheck/build/E2E. Report local and remote CI separately.

## Phase 1 design decisions

- Reuse pure scoring/explanation calculations; do not rewrite formulas. Only available, non-excluded drivers count. MEDIUM/HIGH are flagged; if no driver crosses the driver threshold, suggest a review based on the highest available signal.
- Missing one risk family does not suppress the other; unavailable risk remains null.
- Rank by severity × observed decline multiplier × unaddressed driver count. Stable student-id tie-break. Active means Assigned or In Progress; recommendations alone are not coverage.
- Persist actions and audited state transitions; require assignee/due date on assignment and reason on dismissal. Preserve completed records; deletion is limited to unassigned recommendations and audited.
- Snapshot source records and capture timestamps separately. No changed follow-up observation means outcome unavailable, not zero improvement. Changes are descriptive, never treatment-effect estimates.
- Phase 1 remains compatible with open synthetic demo routes; Phase 3 applies identity scope consistently before publishing the complete workflow.

## Verification environment

Python `.venv/Scripts/python.exe`; `pytest backend/tests`; Node/npm in `frontend`; `npm test`, `npm run build`; local API port 8011 and Vite preview 5174. Use workspace-owned test temp directories to avoid Windows sandbox temp failures. PostgreSQL tests must use synthetic fixtures; no real PII. Review nontrivial decisions with the doubt-driven skill, using read-only reviewers; the user's instruction to proceed supersedes optional approval pauses.
