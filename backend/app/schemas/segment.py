from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.canonical import ORMBaseModel

class SegmentCharacteristics(BaseModel):
    average_success_score: Optional[float] = None
    average_academic_risk: Optional[float] = None
    average_placement_risk: Optional[float] = None
    average_cgpa: Optional[float] = None
    average_attendance: Optional[float] = None
    average_lms_activity: Optional[float] = None
    average_aptitude_score: Optional[float] = None
    average_coding_score: Optional[float] = None

class SegmentSummary(BaseModel):
    segment_id: str
    name: str
    description: str
    student_count: int
    percentage_of_population: float
    criteria: str = "Configured analytical combination."

class SegmentDetailResponse(SegmentSummary):
    characteristics: SegmentCharacteristics
    students: List[str] # List of student IDs

class SegmentListResponse(BaseModel):
    total_students: int
    segments: List[SegmentSummary]

class SegmentMembershipResponse(ORMBaseModel):
    student_id: str
    primary_segment: Optional[str] = None
    secondary_segments: List[str] = []
