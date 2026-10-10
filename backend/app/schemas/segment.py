from pydantic import BaseModel

from backend.app.schemas.canonical import ORMBaseModel


class SegmentCharacteristics(BaseModel):
    average_success_score: float | None = None
    average_academic_risk: float | None = None
    average_placement_risk: float | None = None
    average_cgpa: float | None = None
    average_attendance: float | None = None
    average_lms_activity: float | None = None
    average_aptitude_score: float | None = None
    average_coding_score: float | None = None

class SegmentSummary(BaseModel):
    segment_id: str
    name: str
    description: str
    student_count: int
    percentage_of_population: float
    criteria: str = "Configured analytical combination."

class SegmentDetailResponse(SegmentSummary):
    characteristics: SegmentCharacteristics
    students: list[str] # List of student IDs

class SegmentListResponse(BaseModel):
    total_students: int
    segments: list[SegmentSummary]

class SegmentMembershipResponse(ORMBaseModel):
    student_id: str
    primary_segment: str | None = None
    secondary_segments: list[str] = []
