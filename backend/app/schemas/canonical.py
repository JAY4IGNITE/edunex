import re
from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator


# Reusable validators
def validate_academic_year(v: str) -> str:
    if not re.match(r"^\d{4}-\d{4}$", v):
        raise ValueError("academic_year must be in YYYY-YYYY format")
    return v

class ORMBaseModel(BaseModel):
    model_config = {"from_attributes": True}

class StudentSchema(ORMBaseModel):
    student_id: str = Field(..., min_length=1)
    department: str
    year: int = Field(..., ge=1, le=5)
    semester: int = Field(..., ge=1, le=10)
    section: str
    academic_year: str
    
    _validate_year = field_validator("academic_year")(validate_academic_year)

class AcademicRecordSchema(ORMBaseModel):
    student_id: str
    semester: int = Field(..., ge=1, le=10)
    academic_year: str
    cgpa: float = Field(..., ge=0.0, le=10.0)
    internal_marks: float = Field(..., ge=0.0)
    backlogs: int = Field(..., ge=0)
    subject_performance: dict[str, Any] | None = None

    _validate_year = field_validator("academic_year")(validate_academic_year)

class AttendanceRecordSchema(ORMBaseModel):
    student_id: str
    semester: int = Field(..., ge=1, le=10)
    academic_year: str
    overall_attendance: float = Field(..., ge=0.0, le=100.0)
    subject_attendance: dict[str, Any] | None = None

    _validate_year = field_validator("academic_year")(validate_academic_year)

class LMSRecordSchema(ORMBaseModel):
    student_id: str
    semester: int = Field(..., ge=1, le=10)
    academic_year: str
    login_frequency: float = Field(..., ge=0.0)
    assignment_completion: float = Field(..., ge=0.0, le=100.0)

    _validate_year = field_validator("academic_year")(validate_academic_year)

class EngagementRecordSchema(ORMBaseModel):
    student_id: str
    semester: int = Field(..., ge=1, le=10)
    academic_year: str
    events_count: int = Field(..., ge=0)
    clubs_count: int = Field(..., ge=0)
    hackathons_count: int = Field(..., ge=0)
    certifications_count: int = Field(..., ge=0)

    _validate_year = field_validator("academic_year")(validate_academic_year)

class PlacementRecordSchema(ORMBaseModel):
    student_id: str
    assessment_date: date
    aptitude_score: float = Field(..., ge=0.0, le=100.0)
    coding_score: float = Field(..., ge=0.0, le=100.0)
    mock_interview_score: float = Field(..., ge=0.0, le=100.0)
    placement_participation: bool

class SkillRecordSchema(ORMBaseModel):
    student_id: str
    assessment_date: date
    technical_skill_score: float = Field(..., ge=0.0, le=100.0)
    soft_skill_score: float = Field(..., ge=0.0, le=100.0)

class FeedbackRecordSchema(ORMBaseModel):
    student_id: str
    semester: int = Field(..., ge=1, le=10)
    academic_year: str
    student_satisfaction: float = Field(..., ge=0.0, le=5.0)
    faculty_feedback: Any | None = None

    _validate_year = field_validator("academic_year")(validate_academic_year)

class ProvenanceMetadata(BaseModel):
    dataset_id: str
    source_name: str
    reference: str
    license: str
    acquisition_date: date
    authenticity: str
    domains: list[str]
    verification_status: str
