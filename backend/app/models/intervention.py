from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from backend.app.core.database import Base


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    recommendation_key = Column(String(80), nullable=False)
    recommendation = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="Recommended", index=True)
    assignee = Column(String(80), nullable=True, index=True)
    due_date = Column(Date, nullable=True, index=True)
    notes = Column(Text, nullable=False, default="")
    dismissal_reason = Column(Text, nullable=True)
    before_snapshot = Column(JSON, nullable=False)
    after_snapshot = Column(JSON, nullable=True)
    outcome = Column(JSON, nullable=True)
    active_key = Column(String(200), unique=True, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    __mapper_args__ = {"version_id_col": version}
    __table_args__ = (CheckConstraint("status IN ('Recommended','Assigned','In Progress','Completed','Dismissed')", name="ck_intervention_status"),
                      Index("ix_intervention_status_due", "status", "due_date"))


class InterventionAudit(Base):
    __tablename__ = "intervention_audit"
    id = Column(Integer, primary_key=True)
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=False, index=True)
    actor = Column(String(80), nullable=False)
    event = Column(String(30), nullable=False)
    details = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
