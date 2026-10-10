from sqlalchemy import Column, ForeignKey, String, UniqueConstraint, Integer
from backend.app.core.database import Base


class DemoAssignment(Base):
    __tablename__ = "demo_assignments"
    id = Column(Integer,primary_key=True)
    user_id = Column(String(80),nullable=False,index=True)
    student_id = Column(String,ForeignKey("students.student_id"),nullable=False,index=True)
    __table_args__ = (UniqueConstraint("user_id","student_id",name="uq_demo_assignment"),)
