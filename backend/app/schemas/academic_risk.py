from typing import List, Optional, Dict, Any
from backend.app.schemas.canonical import ORMBaseModel

class AssessmentPeriod(ORMBaseModel):
    semester: int
    academic_year: str

class AcademicRiskResponse(ORMBaseModel):
    student_id: str
    academic_risk_score: float
    risk_level: str
    available_signals: List[str]
    missing_signals: List[str]
    assessment_period: Optional[AssessmentPeriod] = None
