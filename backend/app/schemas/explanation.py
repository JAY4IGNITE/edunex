from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.canonical import ORMBaseModel
from backend.app.schemas.academic_risk import AssessmentPeriod
from backend.app.schemas.placement_risk import AssessmentMetadata

class ContributorBase(ORMBaseModel):
    name: str
    status: str
    excluded_from_calculation: bool
    configured_weight: float
    effective_weight: float

class DomainContributor(ContributorBase):
    normalized_value: Optional[float] = None
    contribution: Optional[float] = None
    direction: str = "neutral"

class RiskDriver(ContributorBase):
    normalized_value: Optional[float] = None
    risk_contribution: Optional[float] = None

class SuccessScoreExplanation(ORMBaseModel):
    score: float
    band: str
    contributors: List[DomainContributor]
    missing_domains: List[str]

class AcademicRiskExplanation(ORMBaseModel):
    score: float
    risk_level: str
    drivers: List[RiskDriver]
    protective_indicators: List[RiskDriver]
    missing_signals: List[str]
    assessment_period: Optional[AssessmentPeriod] = None

class PlacementRiskExplanation(ORMBaseModel):
    score: float
    risk_level: str
    drivers: List[RiskDriver]
    protective_indicators: List[RiskDriver]
    missing_signals: List[str]
    assessment_metadata: AssessmentMetadata

class ExplanationResponse(ORMBaseModel):
    student_id: str
    success_score: SuccessScoreExplanation
    academic_risk: AcademicRiskExplanation
    placement_risk: PlacementRiskExplanation
