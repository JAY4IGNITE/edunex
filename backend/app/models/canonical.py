from sqlalchemy import Column, Integer, String, Float, Boolean, Date, JSON, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class Student(Base, TimestampMixin):
    __tablename__ = "students"

    student_id = Column(String, primary_key=True, index=True)
    department = Column(String, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    section = Column(String, nullable=False)
    academic_year = Column(String, nullable=False, index=True)

    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    lms_records = relationship("LMSRecord", back_populates="student", cascade="all, delete-orphan")
    engagement_records = relationship("EngagementRecord", back_populates="student", cascade="all, delete-orphan")
    placement_records = relationship("PlacementRecord", back_populates="student", cascade="all, delete-orphan")
    skill_records = relationship("SkillRecord", back_populates="student", cascade="all, delete-orphan")
    feedback_records = relationship("FeedbackRecord", back_populates="student", cascade="all, delete-orphan")

class AcademicRecord(Base, TimestampMixin):
    __tablename__ = "academic_records"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    cgpa = Column(Float, nullable=False)
    internal_marks = Column(Float, nullable=False)
    backlogs = Column(Integer, nullable=False)
    subject_performance = Column(JSON, nullable=True)

    student = relationship("Student", back_populates="academic_records")

    __table_args__ = (
        UniqueConstraint('student_id', 'semester', 'academic_year', name='uq_academic_record'),
        Index('idx_academic_student_term', 'student_id', 'semester', 'academic_year'),
    )

class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    overall_attendance = Column(Float, nullable=False)
    subject_attendance = Column(JSON, nullable=True)

    student = relationship("Student", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint('student_id', 'semester', 'academic_year', name='uq_attendance_record'),
        Index('idx_attendance_student_term', 'student_id', 'semester', 'academic_year'),
    )

class LMSRecord(Base, TimestampMixin):
    __tablename__ = "lms_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    login_frequency = Column(Float, nullable=False)
    assignment_completion = Column(Float, nullable=False)

    student = relationship("Student", back_populates="lms_records")

    __table_args__ = (
        UniqueConstraint('student_id', 'semester', 'academic_year', name='uq_lms_record'),
        Index('idx_lms_student_term', 'student_id', 'semester', 'academic_year'),
    )

class EngagementRecord(Base, TimestampMixin):
    __tablename__ = "engagement_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    events_count = Column(Integer, nullable=False)
    clubs_count = Column(Integer, nullable=False)
    hackathons_count = Column(Integer, nullable=False)
    certifications_count = Column(Integer, nullable=False)

    student = relationship("Student", back_populates="engagement_records")

    __table_args__ = (
        UniqueConstraint('student_id', 'semester', 'academic_year', name='uq_engagement_record'),
        Index('idx_engagement_student_term', 'student_id', 'semester', 'academic_year'),
    )

class PlacementRecord(Base, TimestampMixin):
    __tablename__ = "placement_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, unique=True, index=True)
    assessment_date = Column(Date, nullable=False)
    aptitude_score = Column(Float, nullable=False)
    coding_score = Column(Float, nullable=False)
    mock_interview_score = Column(Float, nullable=False)
    placement_participation = Column(Boolean, nullable=False)

    student = relationship("Student", back_populates="placement_records")

class SkillRecord(Base, TimestampMixin):
    __tablename__ = "skill_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, unique=True, index=True)
    assessment_date = Column(Date, nullable=False)
    technical_skill_score = Column(Float, nullable=False)
    soft_skill_score = Column(Float, nullable=False)

    student = relationship("Student", back_populates="skill_records")

class FeedbackRecord(Base, TimestampMixin):
    __tablename__ = "feedback_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    student_satisfaction = Column(Float, nullable=False)
    faculty_feedback = Column(JSON, nullable=True)

    student = relationship("Student", back_populates="feedback_records")

    __table_args__ = (
        UniqueConstraint('student_id', 'semester', 'academic_year', name='uq_feedback_record'),
        Index('idx_feedback_student_term', 'student_id', 'semester', 'academic_year'),
    )
