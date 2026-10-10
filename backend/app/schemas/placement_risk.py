from datetime import date

from backend.app.schemas.canonical import ORMBaseModel


class AssessmentMetadata(ORMBaseModel):
    placement_assessment_date: date | None = None
    skills_assessment_date: date | None = None

class PlacementRiskResponse(ORMBaseModel):
    student_id: str
    placement_risk_score: float
    risk_level: str
    available_signals: list[str]
    missing_signals: list[str]
    assessment_metadata: AssessmentMetadata
