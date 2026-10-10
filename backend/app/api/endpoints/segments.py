from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.segment import SegmentListResponse, SegmentDetailResponse, SegmentMembershipResponse
from backend.app.services.segmentation import SegmentationService
from backend.app.services.cache import CacheService

router = APIRouter()

@router.get("", response_model=SegmentListResponse, summary="Get All Segments")
def get_all_segments(
    department: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns a dynamic computation of all segments over the current student population.
    This calculates sizes and percentages dynamically using configured thresholds.
    """
    cache_key = f"edunex:v1:segments:list:dept={department}:yr={year}:sem={semester}"
    cached = CacheService.get(cache_key)
    if cached:
        return SegmentListResponse(**cached)

    service = SegmentationService(db)
    result = service.get_segments_summary(department, year, semester)
    CacheService.set(cache_key, result, ttl=300, tags=["segments"])
    return result

@router.get("/{segment_id}", response_model=SegmentDetailResponse, summary="Get Segment Detail")
def get_segment_detail(
    segment_id: str, 
    department: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns detailed configuration, student membership, and aggregate characteristics
    for a specific segment using decision-support boundaries.
    """
    service = SegmentationService(db)
    return service.get_segment_detail(segment_id, department, year, semester)

@router.get("/student/{student_id}", response_model=SegmentMembershipResponse, summary="Get Student Segments")
def get_student_segment(student_id: str, db: Session = Depends(get_db)):
    """
    Returns the primary and secondary segments for an individual student.
    """
    from backend.app.services.student_360 import Student360Service
    Student360Service(db).get_student_360(student_id)
    service = SegmentationService(db)
    return service.classify_student(student_id)
