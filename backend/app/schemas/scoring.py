from backend.app.schemas.canonical import ORMBaseModel


class StudentSuccessScoreResponse(ORMBaseModel):
    student_id: str
    success_score: float
    band: str
    domain_scores: dict[str, float]
    available_domains: list[str]
    missing_domains: list[str]
