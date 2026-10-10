from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.repositories.student_360 import Student360Repository
from backend.app.schemas.student_360 import Student360Response


class Student360Service:
    def __init__(self, db: Session):
        self.repo = Student360Repository(db)

    def get_student_360(self, student_id: str) -> Student360Response:
        student_model = self.repo.get_student_360(student_id)
        if not student_model:
            raise HTTPException(status_code=404, detail="Student not found")

        # The joinedload from the repository guarantees all these relationships exist
        return Student360Response(
            student=student_model,
            academic_history=student_model.academic_records,
            attendance_history=student_model.attendance_records,
            lms_history=student_model.lms_records,
            engagement_history=student_model.engagement_records,
            placement_information=student_model.placement_records,
            skills_information=student_model.skill_records,
            feedback_history=student_model.feedback_records
        )

    def get_students_360_bulk(self, student_ids: list[str]) -> list[Student360Response]:
        student_models = self.repo.get_students_360_bulk(student_ids)
        return [
            Student360Response(
                student=sm,
                academic_history=sm.academic_records,
                attendance_history=sm.attendance_records,
                lms_history=sm.lms_records,
                engagement_history=sm.engagement_records,
                placement_information=sm.placement_records,
                skills_information=sm.skill_records,
                feedback_history=sm.feedback_records
            ) for sm in student_models
        ]
