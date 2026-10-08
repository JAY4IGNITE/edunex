from fastapi import APIRouter, Depends, Query, Response
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.canonical import Student
from backend.app.schemas.canonical import StudentSchema
from backend.app.schemas.student_360 import Student360Response
from backend.app.services.student_360 import Student360Service

router = APIRouter()

@router.get("", response_model=List[StudentSchema], summary="List Students")
def list_students(
    response: Response,
    department: Optional[str] = Query(None, description="Filter by department"),
    year: Optional[int] = Query(None, description="Filter by academic year"),
    semester: Optional[int] = Query(None, description="Filter by semester"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of students with optional filtering and pagination.
    Filtering happens at the database level before any expensive calculations.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    query = db.query(Student)
    if department:
        query = query.filter(Student.department == department)
    if year:
        query = query.filter(Student.year == year)
    if semester:
        query = query.filter(Student.semester == semester)
        
    return query.offset(skip).limit(limit).all()

@router.get("/{student_id}", response_model=Student360Response, summary="Get Student 360 View")
def get_student_360_endpoint(student_id: str, response: Response, db: Session = Depends(get_db)):
    """
    Retrieve the unified Student 360 analytical record across all 7 domains:
    Academic, Attendance, LMS, Engagement, Placement, Skills, Feedback.
    Returns a 404 if the student does not exist.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    service = Student360Service(db)
    return service.get_student_360(student_id)
