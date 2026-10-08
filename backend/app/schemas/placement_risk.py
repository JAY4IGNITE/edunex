from typing import List, Optional
from datetime import date
from backend.app.schemas.canonical import ORMBaseModel

class AssessmentMetadata(ORMBaseModel):
    placement_assessment_date: Optional[date] = None
    skills_assessment_date: Optional[date] = None

class PlacementRiskResponse(ORMBaseModel):
    student_id: str
    placement_risk_score: float
    risk_level: str
    available_signals: List[str]
    missing_signals: List[str]
    assessment_metadata: AssessmentMetadata
