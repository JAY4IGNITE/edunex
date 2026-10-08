# Academic Risk Identification

## Purpose
The Academic Risk feature identifies students who may be at risk of poor academic performance. This is achieved by combining multidimensional, canonical signals (CGPA, internal marks, backlogs, attendance, and LMS activity) into a transparent and deterministic academic-risk score (0–100) alongside qualitative risk thresholds.

**Disclaimer:** This is a deterministic decision-support tool. It does not predict a student's future through longitudinal ML modeling nor does it constitute formal institutional diagnosis of failure.

## Risk Signals and Default Weights
Academic Risk evaluates positive learning indicators inversely against detrimental signals (such as backlogs). The baseline configuration explicitly maps the following CampusPulse analytical default weights:
- **CGPA:** 25% (0.25)
- **Internal Marks:** 20% (0.20)
- **Backlogs:** 20% (0.20)
- **Subject Performance:** 15% (0.15)
- **Attendance:** 10% (0.10)
- **LMS Activity (Logins):** 5% (0.05)
- **Assignment Completion:** 5% (0.05)

## Signal Normalization & Direction
Unlike the Success Score, Academic Risk converts positive behaviors into "lower risk". The fundamental normalized formula is:
```
Positive Risk Component = 100 - (Normalized Metric Score)
```
- **CGPA:** Normalized to 100 via `CGPA * 10`. So `CGPA = 8.0` translates to `100 - 80 = 20` risk.
- **Internal Marks:** Natively 0–100.
- **Subject Performance:** Evaluated as an average over dictionary subject-fields, scaled to 100 natively.
- **Attendance:** Natively 0–100.
- **Assignment Completion:** Natively 0–100.

**Backlog Transformation**
Backlogs are inherently negative. They are bounded mathematically so that severe backlogs (e.g., 5+) maximize risk, avoiding scores exceeding 100.
```
Backlog Risk Component = min((backlogs / 5.0) * 100.0, 100.0)
```
*So, 0 backlogs yield 0% risk contribution, whereas 5 backlogs contribute the maximum 100%.*

## Temporal Methodology
Academic Risk strictly evaluates the **most recent available state** of the student to assess immediate risk. 
Rather than blindly averaging historical behavior which could dilute recent deterioration, it searches for the maximum chronological `semester` across `academic_history`, `attendance_history`, and `lms_history`.

## Missing-Data Behavior
If a component (e.g., Subject Performance) is unavailable in the current canonical record, it is mathematically excluded rather than artificially treated as zero-risk or maximum-risk. 
The algorithm renormalizes the remaining domain weights dynamically against `Total Available Weight`.

If no academic indicators exist for a student, the system returns a `400 Bad Request: Insufficient Data` to prevent fabricating an assessment.

## Risk Formula
```
Final Academic Risk Score = Sum(Signal Risk Score * (Signal Weight / Total Available Weight))
```

## Risk Thresholds
Scores are interpreted using analytical bands:
- **60–100:** HIGH
- **30–59:** MEDIUM
- **0–29:** LOW

## Limitations
- This mechanism isolates strictly academic dimensions and purposefully omits variables like Engagement (clubs) or Placements.
- It is deterministic and does not consider complex cross-semester trajectories (e.g., historical variance curves).
