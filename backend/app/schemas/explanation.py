

from backend.app.schemas.academic_risk import AssessmentPeriod
from backend.app.schemas.canonical import ORMBaseModel
from backend.app.schemas.placement_risk import AssessmentMetadata


class ContributorBase(ORMBaseModel):
    name: str
    status: str
    excluded_from_calculation: bool
    configured_weight: float
    effective_weight: float

class DomainContributor(ContributorBase):
    normalized_value: float | None = None
    contribution: float | None = None
    direction: str = "neutral"

class RiskDriver(ContributorBase):
    normalized_value: float | None = None
    risk_contribution: float | None = None

class SuccessScoreExplanation(ORMBaseModel):
    score: float
    band: str
    contributors: list[DomainContributor]
    missing_domains: list[str]

class AcademicRiskExplanation(ORMBaseModel):
    score: float
    risk_level: str
    drivers: list[RiskDriver]
    protective_indicators: list[RiskDriver]
    missing_signals: list[str]
    assessment_period: AssessmentPeriod | None = None

class PlacementRiskExplanation(ORMBaseModel):
    score: float
    risk_level: str
    drivers: list[RiskDriver]
    protective_indicators: list[RiskDriver]
    missing_signals: list[str]
    assessment_metadata: AssessmentMetadata

class ExplanationResponse(ORMBaseModel):
    student_id: str
    success_score: SuccessScoreExplanation
    academic_risk: AcademicRiskExplanation
    placement_risk: PlacementRiskExplanation
