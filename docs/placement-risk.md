# Placement Risk Identification

## Purpose
The Placement Risk feature evaluates a student's readiness for placement outcomes based exclusively on explicit placement and skills metrics. It calculates a deterministic Placement Risk score (0–100) and assigns a qualitative risk band, providing a transparent, configurable decision-support metric.

**Disclaimer:** Placement Risk is an analytical decision-support indicator based on configured placement-readiness signals. It does not guarantee or assert an individual student's actual placement outcome or predict future job acquisition.

## Signals & Default Weights
The algorithm utilizes data from the canonical `placement_information` and `skills_information` domains. The weights are assigned as:
1. **Aptitude Score:** 20% (0.20)
2. **Coding Score:** 25% (0.25)
3. **Mock Interview Score:** 20% (0.20)
4. **Technical Skill Score:** 15% (0.15)
5. **Soft Skill Score:** 10% (0.10)
6. **Placement Participation:** 10% (0.10)

## Signal Direction & Normalization
Placement readiness is measured on a positive scale: the higher the score, the lower the risk. 

For continuous positive variables (`aptitude_score`, `coding_score`, `mock_interview_score`, `technical_skill_score`, `soft_skill_score`), the underlying metric is natively out of 100.
```
Signal Risk Component = 100.0 - metric_score
```

**Placement Participation Treatment:**
Placement Participation (`placement_participation`) is a boolean feature indicating whether a student opted to participate in placement drives/training. It is strictly interpreted as:
- **True (Participated):** 0.0 risk contribution.
- **False (Did Not Participate):** 100.0 risk contribution.

## Missing-Data Behavior
Missing data is **not** converted to zero (which would falsely flag a student as maximum risk). 
Instead, any missing signal is explicitly dropped from the formula, and its weight is proportionally distributed among the available domain signals:
```
Total Available Weight = Sum(Weights of Available Signals)
Final Risk Score = Sum(Signal Risk * (Signal Weight / Total Available Weight))
```
If a student has absolutely no placement or skill assessment data, the system aborts scoring and returns an HTTP 400 Bad Request (`Insufficient data to calculate placement risk`).

## Temporal Methodology
The risk score reflects the student's *current* readiness. The algorithm dynamically locates the most recent assessment date across `placement_information` and `skills_information` independently. 

These independent `assessment_date`s are preserved transparently in the API response as `assessment_metadata` to maintain traceablity without fabricating or averaging disparate temporal events.

## Risk Thresholds
The continuous risk score is mapped into three qualitative thresholds for analytical dashboards:
- **60–100:** HIGH
- **30–59:** MEDIUM
- **0–29:** LOW

## Limitations
- Placement Risk does not utilize external indicators (e.g., student location, socio-economic factors) or advanced machine learning models (e.g., logistic regression).
- It measures placement *readiness* rather than the probability of successfully converting a specific job interview.
