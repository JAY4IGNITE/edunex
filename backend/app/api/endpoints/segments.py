from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.segment import SegmentListResponse, SegmentDetailResponse, SegmentMembershipResponse
from backend.app.services.segmentation import SegmentationService

router = APIRouter()

@router.get("", response_model=SegmentListResponse, summary="Get All Segments")
def get_all_segments(db: Session = Depends(get_db)):
    """
    Returns a dynamic computation of all segments over the current student population.
    This calculates sizes and percentages dynamically using configured thresholds.
    """
    service = SegmentationService(db)
    return service.get_segments_summary()

@router.get("/{segment_id}", response_model=SegmentDetailResponse, summary="Get Segment Detail")
def get_segment_detail(segment_id: str, db: Session = Depends(get_db)):
    """
    Returns detailed configuration, student membership, and aggregate characteristics
    for a specific segment using decision-support boundaries.
    """
    service = SegmentationService(db)
    return service.get_segment_detail(segment_id)

@router.get("/student/{student_id}", response_model=SegmentMembershipResponse, summary="Get Student Segments")
def get_student_segment(student_id: str, db: Session = Depends(get_db)):
    """
    Returns the primary and secondary segments for an individual student.
    """
    service = SegmentationService(db)
    return service.classify_student(student_id)
