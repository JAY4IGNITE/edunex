# Institutional Insights (Phase 11)

## Purpose
The Insights layer converts deterministic analytical records into structured institutional summaries, surfacing cohort-level trends and decision-support observations natively without relying on AI hallucination or generic text strings.

**Disclaimer:** Insights are descriptive and analytical summaries derived from the available dataset. They do not establish causality or guarantee future outcomes.

## Insight Categories

The API securely isolates insights into mathematical buckets:
1. **Academic Risk Distribution**
2. **Placement Risk Distribution**
3. **Comparative Analysis (e.g. Cohort Success Score vs Institution Baseline)**
4. **Academic vs Placement Readiness Cohorts**
5. **Engagement Overview**
6. **Longitudinal Trends**

## Calculation Methodologies

Insights securely iterate across current real-time dataset identities. 
Missing records are mathematically bypassed, dropping unassessable segments securely instead of defaulting missing information to zero risk or arbitrary averages.

### Engagement Methodology
The Engagement index directly evaluates canonical variables (`events_count + clubs_count + hackathons_count + certifications_count`) per real student mapped through `Student360` profiles. The endpoint highlights intersecting cohorts (e.g., highly engaged students experiencing academic struggles).

## Filtering
`GET /api/insights` supports parameters matching native internal datasets:
- `department`
- `year`
- `semester`

**Crucially:** Filters are passed down directly to the SQLAlchemy queries generating the cohort array *before* iterations occur. Cohort insights reflect only the genuinely filtered population.

## Comparative Methodology
If filters (e.g. `department=CSE`) are activated, the layer generates isolated statistics and securely performs a differential check against the baseline Institution average, emitting actionable observations like: "This is 2.4 points higher than the institution baseline".

## Minimum Cohort Protection
If an applied filter results in a population smaller than `InsightConfig.MIN_COHORT_SIZE` (default 10), the endpoint securely suppresses comparisons, generating an `INSUFFICIENT_DATA` warning instead of producing skewed, statistically irrelevant results.

## Trend Methodology
Trends are descriptive historical summaries and are not forecasts.
They isolate semester arrays inside student profiles to track fluctuations. A minimum of `2` available historical periods are required for a metric to trigger a `Longitudinal Performance Trends` Insight.

## Responsible Interpretation
The architecture is inherently scoped as decision support:
- **Valid Output:** "Attendance and Success Score show a positive association in this dataset."
- **Invalid Constraint:** "These students will fail."

There are strictly NO intervention recommendation systems, email triggers, chatbot workflows, or ML prediction chains attached to Phase 11.
