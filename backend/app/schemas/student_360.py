
from pydantic import BaseModel

from backend.app.schemas.canonical import (
    AcademicRecordSchema,
    AttendanceRecordSchema,
    EngagementRecordSchema,
    FeedbackRecordSchema,
    LMSRecordSchema,
    PlacementRecordSchema,
    SkillRecordSchema,
    StudentSchema,
)


class Student360Response(BaseModel):
    student: StudentSchema
    academic_history: list[AcademicRecordSchema] = []
    attendance_history: list[AttendanceRecordSchema] = []
    lms_history: list[LMSRecordSchema] = []
    engagement_history: list[EngagementRecordSchema] = []
    placement_information: list[PlacementRecordSchema] = []
    skills_information: list[SkillRecordSchema] = []
    feedback_history: list[FeedbackRecordSchema] = []

    model_config = {"from_attributes": True}
