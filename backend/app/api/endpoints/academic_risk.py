from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.academic_risk import AcademicRiskResponse
from backend.app.services.academic_risk import AcademicRiskService

router = APIRouter()

@router.get("/{student_id}/academic-risk", response_model=AcademicRiskResponse, summary="Get Academic Risk")
def get_academic_risk(student_id: str, db: Session = Depends(get_db)):
    """
    Calculate and return the Academic Risk score based on 7 academic signals.
    Missing signals are correctly excluded and weights are renormalized.
    Returns 404 if the student is not found.
    """
    service = AcademicRiskService(db)
    return service.get_or_calculate_academic_risk(student_id)
