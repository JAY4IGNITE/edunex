from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.sql import func

from backend.app.models.base import Base


class PlacementRiskScore(Base):
    __tablename__ = "placement_risk_scores"

    student_id = Column(String, ForeignKey("students.student_id"), primary_key=True)
    placement_risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    available_signals = Column(JSON, nullable=False)
    missing_signals = Column(JSON, nullable=False)
    assessment_metadata = Column(JSON, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
