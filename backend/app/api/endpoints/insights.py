from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.insight import InsightResponse
from backend.app.services.insight import InsightService

router = APIRouter()

@router.get("", response_model=InsightResponse, summary="Get Student Insights")
def get_insights(
    department: Optional[str] = None,
    year: Optional[int] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Returns dynamically generated analytical insights derived from the 
    current database. Will return an 'insufficient_sample' alert if 
    the filtered cohort size falls below the minimum configured threshold.
    """
    service = InsightService(db)
    return service.generate_insights(department=department, year=year, semester=semester)
