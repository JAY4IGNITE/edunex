from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.explanation import ExplanationResponse
from backend.app.services.cache import CacheService
from backend.app.services.explanation import ExplanationService

router = APIRouter()

@router.get("/{student_id}/explanation", response_model=ExplanationResponse, summary="Get Explainable Analytics")
def get_student_explanation(student_id: str, db: Session = Depends(get_db)):
    """
    Returns a comprehensive, deterministic, mathematically reconciled explanation for:
    - Student Success Score
    - Academic Risk
    - Placement Risk
    Explicitly tracks missing data, renormalized weights, and drivers vs protective indicators.
    """
    cache_key = f"edunex:v1:student:{student_id}:explanation"
    cached = CacheService.get(cache_key)
    if cached:
        return ExplanationResponse(**cached)

    service = ExplanationService(db)
    result = service.get_explanation(student_id)
    CacheService.set(cache_key, result, ttl=300, tags=[f"student:{student_id}"])
    return result
