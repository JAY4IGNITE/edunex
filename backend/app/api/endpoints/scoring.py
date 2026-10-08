from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.scoring import StudentSuccessScoreResponse
from backend.app.services.scoring import ScoringService

router = APIRouter()

@router.get("/{student_id}/success-score", response_model=StudentSuccessScoreResponse, summary="Get Student Success Score")
def get_student_success_score(student_id: str, db: Session = Depends(get_db)):
    """
    Calculate and return the Student Success Score based on 7 available domains.
    Missing domains are correctly excluded and weights are renormalized.
    Returns 404 if the student is not found.
    """
    service = ScoringService(db)
    return service.get_or_calculate_success_score(student_id)
