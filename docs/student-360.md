# Student 360

## Purpose
The Student 360 layer provides a unified analytical view of a single student across all integrated data domains. It serves as the foundation for future capabilities, including the Student Success Score, risk assessments, and targeted intervention recommendations, by presenting a holistic temporal picture of the student journey.

## Seven Domains
Student 360 aggregates records from the following seven core domains:
1. Academic
2. Attendance
3. LMS
4. Engagement
5. Placement
6. Skills
7. Feedback

## Entity Relationships
The central entity is the `Student`, identified by the canonical `student_id`.
All domain records are linked directly to `student_id` via foreign keys.
To support analytical and historical analysis, the repository layer (`Student360Repository`) executes an optimized query with `joinedload` on all domain relationships, retrieving the complete subgraph for a student in a single efficient transaction.

## Temporal Handling
To preserve the sequence of a student's journey, Student 360 does **not** flatten historical periods. 
Period-based domains (Academic, Attendance, LMS, Engagement, Feedback) return records granularly identified by `academic_year` and `semester`.
Assessment-based domains (Placement, Skills) retain their specific `assessment_date`.
This ensures that downstream consumers (like LLMs or predictive models) can observe trends over time.

## API Response Structure
The `GET /api/students/{student_id}` endpoint returns a strictly-typed JSON object adhering to the `Student360Response` schema:

```json
{
  "student": {
    "student_id": "STU0001",
    "department": "Computer Science",
    "year": 3,
    "semester": 6,
    "section": "A",
    "academic_year": "2023-2024"
  },
  "academic_history": [
    {
      "student_id": "STU0001",
      "semester": 6,
      "academic_year": "2023-2024",
      "cgpa": 8.5,
      ...
    }
  ],
  "attendance_history": [...],
  "lms_history": [...],
  "engagement_history": [...],
  "placement_information": [...],
  "skills_information": [...],
  "feedback_history": [...]
}
```

## Missing-Data Behavior
The system preserves genuine missing data rather than substituting artificial defaults. 
If a student has no records for a particular domain (e.g., they haven't taken any placement assessments), the array for that domain will explicitly be empty (`[]`). 
No fabricated records or fallback `0` metrics are generated.

## Limitations
- The current layer is optimized for individual retrieval (point lookups). Cohort-level batch retrieval will require specialized paginated endpoints and adjusted indexing strategies.
- The raw API format returns domain models exactly as ingested. Any derived metrics (e.g. "trend score") are out of scope for this foundation.
