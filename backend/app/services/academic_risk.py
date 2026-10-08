from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.core.academic_risk_config import AcademicRiskConfig
from backend.app.models.academic_risk import AcademicRiskScore
from backend.app.services.student_360 import Student360Service
from backend.app.schemas.academic_risk import AcademicRiskResponse, AssessmentPeriod

class AcademicRiskService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)

    def _get_latest_record(self, records):
        if not records:
            return None
        # Semester strictly increases over time
        return max(records, key=lambda x: x.semester)

    def calculate_signal_risks(self, student_360) -> tuple[dict, AssessmentPeriod]:
        latest_academic = self._get_latest_record(student_360.academic_history)
        latest_attendance = self._get_latest_record(student_360.attendance_history)
        latest_lms = self._get_latest_record(student_360.lms_history)

        if not latest_academic and not latest_attendance and not latest_lms:
            return {}, None

        # Determine the assessment period from the most relevant record (Academic > Attendance > LMS)
        reference_record = latest_academic or latest_attendance or latest_lms
        assessment_period = AssessmentPeriod(
            semester=reference_record.semester,
            academic_year=reference_record.academic_year
        )

        signal_risks = {}
        
        # 1. CGPA (Positive, 0-10 -> 0-100)
        if latest_academic:
            normalized_cgpa = latest_academic.cgpa * 10.0
            signal_risks["cgpa"] = 100.0 - normalized_cgpa
            
            # 2. Internal Marks (Positive, 0-100)
            signal_risks["internal_marks"] = 100.0 - latest_academic.internal_marks
            
            # 3. Backlogs (Negative, bounded at 5 = 100%)
            signal_risks["backlogs"] = min((latest_academic.backlogs / AcademicRiskConfig.MAX_BACKLOGS) * 100.0, 100.0)

            # 4. Subject Performance (Positive, dict values 0-100)
            if latest_academic.subject_performance:
                scores = list(latest_academic.subject_performance.values())
                if scores:
                    avg_sp = sum(scores) / len(scores)
                    signal_risks["subject_performance"] = 100.0 - avg_sp

        # 5. Attendance (Positive, 0-100)
        if latest_attendance:
            signal_risks["attendance"] = 100.0 - latest_attendance.overall_attendance

        # 6. LMS Activity (Positive, bounded at 50)
        if latest_lms:
            normalized_lms_login = min((latest_lms.login_frequency / AcademicRiskConfig.MAX_LMS_LOGIN) * 100.0, 100.0)
            signal_risks["lms_activity"] = 100.0 - normalized_lms_login
            
            # 7. Assignment Completion (Positive, 0-100)
            signal_risks["assignment_completion"] = 100.0 - latest_lms.assignment_completion

        return {k: round(v, 2) for k, v in signal_risks.items()}, assessment_period

    def get_or_calculate_academic_risk(self, student_id: str) -> AcademicRiskResponse:
        student_360 = self.student_360_service.get_student_360(student_id)

        signal_risks, assessment_period = self.calculate_signal_risks(student_360)
        
        available_signals = list(signal_risks.keys())
        missing_signals = [s for s in AcademicRiskConfig.DEFAULT_WEIGHTS.keys() if s not in available_signals]

        if not available_signals:
            raise HTTPException(status_code=400, detail="Insufficient data to calculate academic risk")

        total_available_weight = sum(AcademicRiskConfig.DEFAULT_WEIGHTS[s] for s in available_signals)
        
        if total_available_weight == 0:
            raise HTTPException(status_code=400, detail="Available signals have 0 weight")

        final_risk_score = sum(
            signal_risks[s] * (AcademicRiskConfig.DEFAULT_WEIGHTS[s] / total_available_weight)
            for s in available_signals
        )

        final_risk_score = round(final_risk_score, 2)
        risk_level = AcademicRiskConfig.get_risk_level(final_risk_score)

        # Persist
        score_record = self.db.query(AcademicRiskScore).filter_by(student_id=student_id).first()
        if not score_record:
            score_record = AcademicRiskScore(student_id=student_id)
            self.db.add(score_record)
            
        score_record.academic_risk_score = final_risk_score
        score_record.risk_level = risk_level
        score_record.available_signals = available_signals
        score_record.missing_signals = missing_signals
        score_record.assessment_period = assessment_period.model_dump()

        self.db.commit()
        self.db.refresh(score_record)

        # Invalidate related caches AFTER successful transaction
        from backend.app.services.cache import CacheService
        from backend.app.services.pubsub import PubSubService
        
        CacheService.invalidate_tags(["analytics", "segments", "insights", f"student:{student_id}"])
        PubSubService.publish("student_updated", {"student_id": student_id})

        return AcademicRiskResponse(
            student_id=student_id,
            academic_risk_score=final_risk_score,
            risk_level=risk_level,
            available_signals=available_signals,
            missing_signals=missing_signals,
            assessment_period=assessment_period
        )
