# CampusPulse AI — Product Requirements Document

## 1. Product

**CampusPulse AI**

### Positioning

An analytics platform that unifies academic, attendance, LMS, engagement, placement, skills and feedback data into an explainable Student Success Score that helps institutions identify academic and placement risks, discover meaningful student segments and make data-driven decisions.

## 2. Challenge alignment

The product directly addresses:

1. Data Integration
2. Student Success Score
3. Academic Risk Identification
4. Placement Risk Identification
5. Interactive Analytics Dashboard

Bonus capabilities:

- Student Segmentation
- Explainable Score

## 3. Mandatory data domains

- Academic: CGPA, marks, backlogs, subject performance
- Attendance: overall and subject-wise attendance
- LMS: login frequency, assignment completion
- Engagement: events, clubs, hackathons, certifications
- Placement: aptitude, coding, mock interview, participation
- Skills: technical and soft skills
- Feedback: student satisfaction, faculty feedback

All unified institutional records use `student_id`.

## 4. Success Score

Initial configurable weights:

| Domain | Weight |
|---|---:|
| Academic | 25% |
| Attendance | 15% |
| LMS | 15% |
| Engagement | 10% |
| Placement | 20% |
| Skills | 10% |
| Feedback | 5% |

All applicable domain values are normalized to a 0–100 analytical scale.

Missing values must not silently become zero. If a domain is unavailable, its weight should be excluded and remaining available weights renormalized.

Initial interpretation bands:

- 80–100: Excellent
- 65–79: Good
- 50–64: Moderate
- 0–49: Needs Attention

These are configurable interpretation bands, not institutional policy.

## 5. Risk intelligence

### Academic Risk

Potential signals:

- CGPA
- internal marks
- backlogs
- attendance
- subject performance
- LMS engagement
- assignment completion

### Placement Risk

Potential signals:

- aptitude
- coding
- mock interview
- technical skills
- soft skills
- placement participation

Risk outputs are LOW / MEDIUM / HIGH and must be phrased as analytical risk, not deterministic outcomes.

## 6. Explainability

Each student should eventually be able to see:

- Success Score
- positive contributors
- negative contributors
- academic risk drivers
- placement risk drivers

All explanations must be traceable to stored input data and configured scoring logic.

## 7. Segmentation

Initial interpretable segments:

1. High Academic + High Placement
2. High Academic + Low Placement
3. Low Academic + High Placement
4. Low Academic + Low Placement
5. High Engagement + Low Academic
6. Low Engagement + Low Academic

## 8. Dashboard

Planned navigation:

- Overview
- Students
- Risk Intelligence
- Student Segments
- Insights
- Data Integration

## 9. Out of MVP

- Coding platform
- Coding judge/compiler
- AI interview chatbot
- Interview scheduling
- Resume builder
- Job portal
- LMS replacement
- Attendance management system
- College ERP
- Autonomous intervention agents
- Multi-agent architecture
- Mobile application
- Blockchain
- Facial recognition

## 10. Demo narrative

Data → Score → Risk → Explanation → Segment → Insight

The demo must use computed results rather than hardcoded statistics.
