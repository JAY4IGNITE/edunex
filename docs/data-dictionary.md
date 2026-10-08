# Canonical Data Dictionary

## Student master

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical institutional student identifier |
| department | string | Academic department |
| year | integer | Current academic year |
| semester | integer | Current semester |
| section | string | Section |
| academic_year | string | Academic year |

## Academic

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| semester | integer | Semester |
| academic_year | string | Academic year |
| cgpa | float | CGPA according to declared scale |
| internal_marks | float | Internal assessment marks |
| backlogs | integer | Number of backlogs |
| subject_performance | object | Subject-level performance |

## Attendance

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| semester | integer | Semester |
| academic_year | string | Academic year |
| overall_attendance | float | Percentage |
| subject_attendance | object | Subject-level attendance |

## LMS

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| semester | integer | Semester |
| academic_year | string | Academic year |
| login_frequency | float | Defined LMS login/activity measure |
| assignment_completion | float | Completion percentage |

## Engagement

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| semester | integer | Semester |
| academic_year | string | Academic year |
| events_count | integer | Event participation count |
| clubs_count | integer | Club participation count |
| hackathons_count | integer | Hackathon participation count |
| certifications_count | integer | Certification count |

## Placement

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| assessment_date | date | Assessment date |
| aptitude_score | float | Aptitude score on declared scale |
| coding_score | float | Coding assessment score |
| mock_interview_score | float | Mock interview score |
| placement_participation | boolean | Participated in placement process |

## Skills

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| assessment_date | date | Assessment date |
| technical_skill_score | float | Technical skill score |
| soft_skill_score | float | Soft skill score |

## Feedback

| Field | Type | Description |
|---|---|---|
| student_id | string | Canonical student ID |
| semester | integer | Semester |
| academic_year | string | Academic year |
| student_satisfaction | float | Satisfaction score on declared scale |
| faculty_feedback | float/string/object | Faculty feedback according to declared representation |

Definitions and ranges must be validated against each source before ingestion.
