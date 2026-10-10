from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.placement_risk import PlacementRiskResponse
from backend.app.services.cache import CacheService
from backend.app.services.placement_risk import PlacementRiskService

router = APIRouter()

@router.get("/{student_id}/placement-risk", response_model=PlacementRiskResponse, summary="Get Placement Risk")
def get_placement_risk(student_id: str, db: Session = Depends(get_db)):
    """
    Calculate and return the Placement Risk score based on 6 placement-readiness signals.
    Missing signals are correctly excluded and weights are renormalized.
    Returns 404 if the student is not found.
    """
    cache_key = f"edunex:v1:student:{student_id}:placement-risk"
    cached = CacheService.get(cache_key)
    if cached:
        return PlacementRiskResponse(**cached)

    service = PlacementRiskService(db)
    result = service.get_or_calculate_placement_risk(student_id)
    CacheService.set(cache_key, result, ttl=300, tags=[f"student:{student_id}"])
    return result
