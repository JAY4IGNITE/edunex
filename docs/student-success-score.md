# Student Success Score

## Purpose
The Student Success Score translates the complex multidimensional Student 360 data into a single, understandable metric (0–100). It serves as a transparent decision-support tool. It provides a common denominator for understanding student performance across academics, engagement, placement readiness, and feedback.

**Disclaimer:** The scoring bands and weights used in this implementation are analytical defaults designed for demonstration and data-science exploration. They are NOT formally validated institutional policy, nor do they predict future success through validated clinical/academic models.

## Seven Scoring Domains & Default Weights
The algorithm utilizes data from all seven canonical domains. By default, the weights are distributed as:
1. **Academic:** 25% (0.25)
2. **Placement:** 20% (0.20)
3. **Attendance:** 15% (0.15)
4. **LMS:** 15% (0.15)
5. **Engagement:** 10% (0.10)
6. **Skills:** 10% (0.10)
7. **Feedback:** 5% (0.05)

## Domain-Level Calculations & Normalization
All metrics are transformed onto a uniform `0-100` scale. A simple averaging methodology is used across available records to favor determinism over complex time-series heuristics.

- **Academic:** Average of `cgpa` across semesters, multiplied by 10 (since CGPA is 0-10).
- **Attendance:** Average of `overall_attendance` (natively 0-100).
- **LMS:** Average of `assignment_completion` (natively 0-100).
- **Engagement:** Sum of all `events_count`, `clubs_count`, `hackathons_count`, and `certifications_count` multiplied by 10, capped at 100.
- **Placement:** Average of `aptitude_score`, `coding_score`, and `mock_interview_score` (natively 0-100).
- **Skills:** Average of `technical_skill_score` and `soft_skill_score` (natively 0-100).
- **Feedback:** Average of `student_satisfaction` across semesters, multiplied by 20 (since satisfaction is 0-5).

## Missing-Data Methodology & Renormalization
To prevent penalizing students for unrecorded domains (e.g. no placement data for first-year students), missing data does NOT count as a zero.
Instead, the domain is explicitly excluded from the calculation, and its weight is proportionally distributed among the available domains.

**Renormalization Formula:**
```
Total Available Weight = Sum(Weights of Available Domains)
Final Score = Sum(Domain Score * (Domain Weight / Total Available Weight))
```

## Score Bands
The final 0-100 score is classified into one of four qualitative bands:
- **80–100:** Excellent
- **65–79:** Good
- **50–64:** Moderate
- **0–49:** Needs Attention

## Limitations
- The current algorithm simply averages historical data and does not apply recency weighting (e.g. favoring later semesters).
- The score is fully deterministic, lacking predictive capabilities or ML regressions.
