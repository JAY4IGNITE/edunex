from sqlalchemy import Column, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from backend.app.models.base import Base

class StudentSuccessScore(Base):
    __tablename__ = "student_success_scores"

    student_id = Column(String, ForeignKey("students.student_id"), primary_key=True)
    score = Column(Float, nullable=False)
    band = Column(String, nullable=False)
    domain_scores = Column(JSON, nullable=False)
    available_domains = Column(JSON, nullable=False)
    missing_domains = Column(JSON, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
