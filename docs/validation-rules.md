# Data Validation Rules

## Structural

- Required columns must exist.
- Types must be compatible.
- Unexpected schema changes must be reported.
- Duplicate records must be detected.

## Identity

- Required student identifiers must be present.
- Orphan domain records must be reported.
- Cross-source student-level matching is prohibited unless a legitimate identity mapping exists.

## Temporal

- Semester/year values must be valid.
- Duplicate student-period records must be detected.
- Assessment dates must be valid.

## Range

Examples:
- attendance: 0–100 where percentage is declared
- aptitude/coding/mock interview: 0–100 only when source definition supports that scale
- satisfaction: source-defined range
- CGPA: source-defined scale

## Missingness

Missing data must be reported.
Missing score data must not silently become zero.

## Provenance

Every accepted source must have provenance metadata.
Unverified license/source mapping remains `UNKNOWN — REQUIRES VERIFICATION`.

## Quality report

Each ingestion run should eventually report:

- records processed
- valid records
- invalid records
- duplicates
- missing values
- orphan records
- schema violations
- provenance status
