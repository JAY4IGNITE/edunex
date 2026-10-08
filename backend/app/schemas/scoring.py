from typing import Dict, List, Optional
from backend.app.schemas.canonical import ORMBaseModel

class StudentSuccessScoreResponse(ORMBaseModel):
    student_id: str
    success_score: float
    band: str
    domain_scores: Dict[str, float]
    available_domains: List[str]
    missing_domains: List[str]
