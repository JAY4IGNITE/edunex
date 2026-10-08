from sqlalchemy import Column, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from backend.app.models.base import Base

class AcademicRiskScore(Base):
    __tablename__ = "academic_risk_scores"

    student_id = Column(String, ForeignKey("students.student_id"), primary_key=True)
    academic_risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    available_signals = Column(JSON, nullable=False)
    missing_signals = Column(JSON, nullable=False)
    assessment_period = Column(JSON, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
