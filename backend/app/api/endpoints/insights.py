
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.insight import InsightResponse
from backend.app.services.cache import CacheService
from backend.app.services.insight import InsightService

router = APIRouter()

@router.get("", response_model=InsightResponse, summary="Get Student Insights")
def get_insights(
    response: Response,
    department: str | None = None,
    year: int | None = None,
    semester: int | None = None,
    db: Session = Depends(get_db)
):
    """
    Returns dynamically generated analytical insights derived from the 
    current database. Will return an 'insufficient_sample' alert if 
    the filtered cohort size falls below the minimum configured threshold.
    """
    # Instruct the browser to cache this insight query for 5 minutes (300 seconds)
    response.headers["Cache-Control"] = "public, max-age=300"
    
    cache_key = f"edunex:v1:insights:list:dept={department}:yr={year}:sem={semester}"
    cached = CacheService.get(cache_key)
    if cached:
        return InsightResponse(**cached)
        
    service = InsightService(db)
    result = service.generate_insights(department=department, year=year, semester=semester)
    CacheService.set(cache_key, result, ttl=300, tags=["insights"])
    return result
