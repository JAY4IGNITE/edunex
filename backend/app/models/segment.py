from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.sql import func

from backend.app.models.base import Base


class StudentSegmentMembership(Base):
    __tablename__ = "student_segment_memberships"

    student_id = Column(String, ForeignKey("students.student_id"), primary_key=True)
    segment_id = Column(String, primary_key=True)
    membership_type = Column(String, nullable=False) # e.g. "PRIMARY", "SECONDARY"
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
