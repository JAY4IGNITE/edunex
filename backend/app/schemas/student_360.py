from typing import List
from pydantic import BaseModel
from backend.app.schemas.canonical import (
    StudentSchema, AcademicRecordSchema, AttendanceRecordSchema,
    LMSRecordSchema, EngagementRecordSchema, PlacementRecordSchema,
    SkillRecordSchema, FeedbackRecordSchema
)

class Student360Response(BaseModel):
    student: StudentSchema
    academic_history: List[AcademicRecordSchema] = []
    attendance_history: List[AttendanceRecordSchema] = []
    lms_history: List[LMSRecordSchema] = []
    engagement_history: List[EngagementRecordSchema] = []
    placement_information: List[PlacementRecordSchema] = []
    skills_information: List[SkillRecordSchema] = []
    feedback_history: List[FeedbackRecordSchema] = []

    model_config = {"from_attributes": True}
