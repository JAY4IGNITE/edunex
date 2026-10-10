# Responsible-use and control mapping

This is a project-level mapping of stated safeguards to the current prototype. It is not a legal compliance assessment or certification. Every example row is synthetic.

| Concern | Current behavior and evidence | Limit before real-data use |
|---|---|---|
| Privacy and data minimization | The checked-in demonstration dataset is synthetic; the UI and docs identify it as such. | No real student identifiers or source-system exports may be added to this demo. A real deployment needs institutional privacy review, approved purposes, consent/legal basis, retention, deletion, and incident procedures. |
| Authentication and authorization | A signed, expiring server session identifies a public demo role. Database reads are scoped by department or seeded assignment before pagination and aggregates. See `backend/app/core/demo_auth.py`, `backend/app/core/access_scope.py`, and `backend/tests/test_auth_scope.py`. | The public role picker is not identity verification. Replace it with institutional SSO, role provisioning, and auditable authorization before handling real records. |
| Human oversight | Recommendations are suggestions. Staff explicitly assign, update, complete, or dismiss them. Status changes record the selected demo actor and version. | No action is automated. Staff must inspect source signals, consider missing data, and apply institutional policy. |
| Transparency | The seven-domain score and available-driver logic are documented. The model report is reproducible and the model card states its low-recall limitation and synthetic-only evaluation. | Associations do not establish causes, individual outcomes, or intervention effects. The current model has no prospective institutional validation. |
| Fairness and accessibility | Sensitive demographic attributes are not inputs to the demo model; the interface includes keyboard and reduced-motion support. | Synthetic profiles cannot establish subgroup fairness. Audit real-world errors, proxy variables, accessibility, and disparate impact before use. |
| Audit and correction | Intervention changes create an application-level audit event and use optimistic version checks. | This is not a tamper-proof compliance log. Define access, retention, correction, export, and monitoring controls for a real system. |
| Availability and continuity | Readiness checks Postgres; startup runs migrations and idempotent seed; Render Free limitations are documented. | Free Postgres expires after 30 days and provides no backups. It is unsuitable for real student records or durable production service. |

## Review checklist before any institutional deployment

1. Replace the public synthetic picker with institution-controlled identity and verified role mappings.
2. Obtain privacy/security, accessibility, data-governance, and model-risk review for the approved jurisdiction and purpose.
3. Validate on representative historical and prospective cohorts; report calibration and subgroup error with uncertainty.
4. Add secure audit retention, incident response, database backups, monitoring, key rotation, and documented recovery tests.
5. Train staff on score limitations, source-data gaps, correction/appeal paths, and the requirement for independent human judgment.
