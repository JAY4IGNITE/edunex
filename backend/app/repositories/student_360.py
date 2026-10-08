from sqlalchemy.orm import Session, joinedload
from backend.app.models.canonical import Student

class Student360Repository:
    """
    Foundation repository for a unified Student 360 analytical view.
    Instead of an immediate database view, this provides an ORM-based
    unified retrieval that guarantees all 7 required domains are eagerly loaded.
    This pattern offers flexibility and explicit contract mapping before
    we finalize complex SQL views or materialized views in later phases.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_student_360(self, student_id: str):
        return self.db.query(Student).options(
            joinedload(Student.academic_records),
            joinedload(Student.attendance_records),
            joinedload(Student.lms_records),
            joinedload(Student.engagement_records),
            joinedload(Student.placement_records),
            joinedload(Student.skill_records),
            joinedload(Student.feedback_records)
        ).filter(Student.student_id == student_id).first()

    def get_students_360_bulk(self, student_ids: list[str]):
        return self.db.query(Student).options(
            joinedload(Student.academic_records),
            joinedload(Student.attendance_records),
            joinedload(Student.lms_records),
            joinedload(Student.engagement_records),
            joinedload(Student.placement_records),
            joinedload(Student.skill_records),
            joinedload(Student.feedback_records)
        ).filter(Student.student_id.in_(student_ids)).all()
