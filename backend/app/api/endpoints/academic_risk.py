from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.academic_risk import AcademicRiskResponse
from backend.app.services.academic_risk import AcademicRiskService
from backend.app.services.cache import CacheService

router = APIRouter()

@router.get("/{student_id}/academic-risk", response_model=AcademicRiskResponse, summary="Get Academic Risk")
def get_academic_risk(student_id: str, db: Session = Depends(get_db)):
    """
    Calculate and return the Academic Risk score based on 7 academic signals.
    Missing signals are correctly excluded and weights are renormalized.
    Returns 404 if the student is not found.
    """
    cache_key = f"edunex:v1:student:{student_id}:academic-risk"
    cached = CacheService.get(cache_key)
    if cached:
        return AcademicRiskResponse(**cached)

    service = AcademicRiskService(db)
    result = service.get_or_calculate_academic_risk(student_id)
    CacheService.set(cache_key, result, ttl=300, tags=[f"student:{student_id}"])
    return result
