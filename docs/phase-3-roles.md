# Phase 3: demo identities and stakeholder access

EduNex now provides a clearly labeled synthetic demo identity picker for Admin, Faculty, Mentor, and Counselor. The selected identity is stored in a signed, expiring server-side session cookie. It is a demonstration convenience, not a production authentication or enrollment system.

The API applies scope in the database query layer before pagination and aggregation. Admin can inspect the full synthetic dataset. Faculty is restricted to the selected department. Mentors and Counselors see their deterministic seeded demo caseload plus records for active interventions assigned to them. Intervention edits and deletion follow role rules; the API derives actor identity from the session. Reads without a valid session fail closed. The aggregate data-quality endpoint is admin-only.

The session cookie is HTTP-only and has an explicit lifetime. Local development uses same-site cookies; the cross-origin Render deployment uses secure cookies and credentialed CORS restricted to `FRONTEND_ORIGIN`. Unsafe API requests require a matching allowed Origin and the custom `X-Requested-With` header. Configure `EDUNEX_SESSION_SECRET` as a high-entropy secret in the backend service environment before deploying; `render.yaml` intentionally leaves it unset for dashboard configuration.

The login page lets reviewers switch among synthetic roles. Switching clears cached API data before rendering the new role. The header identifies the active role and scope. Mentor and Counselor sessions open the student list so the limited caseload is visible immediately.

Verification:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_auth_scope.py backend/tests/test_interventions.py -q --basetemp=.phase-work/pytest-phase3-focused
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

The role-scope integration tests use the configured Postgres database and verify isolation against the synthetic seeded data. The production typecheck and frontend tests pass. A full backend-suite attempt in this environment stopped after the existing ML temporal-data test waited on its configured Postgres connection; the suite was interrupted rather than allowing an indefinite wait. Re-run it after confirming the configured database is reachable.

## Production boundary

The demo identity picker is public by design, and must not be presented as a real account security boundary. Before using real student data, replace it with institutional identity, authorization policy, consent, audit, and retention controls. No student data beyond the synthetic demo dataset belongs in this build.
