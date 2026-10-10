from backend.app.schemas.canonical import ORMBaseModel


class AssessmentPeriod(ORMBaseModel):
    semester: int
    academic_year: str

class AcademicRiskResponse(ORMBaseModel):
    student_id: str
    academic_risk_score: float
    risk_level: str
    available_signals: list[str]
    missing_signals: list[str]
    assessment_period: AssessmentPeriod | None = None
