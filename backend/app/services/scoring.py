from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.core.scoring_config import ScoringConfig
from backend.app.models.scoring import StudentSuccessScore
from backend.app.services.student_360 import Student360Service
from backend.app.schemas.scoring import StudentSuccessScoreResponse

class ScoringService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)

    def calculate_domain_scores(self, student_360) -> dict:
        scores = {}
        
        # Academic (cgpa 0-10 -> 0-100)
        if student_360.academic_history:
            avg_cgpa = sum(r.cgpa for r in student_360.academic_history) / len(student_360.academic_history)
            scores["academic"] = avg_cgpa * 10.0

        # Attendance (overall_attendance 0-100)
        if student_360.attendance_history:
            avg_att = sum(r.overall_attendance for r in student_360.attendance_history) / len(student_360.attendance_history)
            scores["attendance"] = avg_att

        # LMS (assignment_completion 0-100)
        if student_360.lms_history:
            avg_lms = sum(r.assignment_completion for r in student_360.lms_history) / len(student_360.lms_history)
            scores["lms"] = avg_lms

        # Engagement (sum of counts, arbitrarily capped at 100 for normalization)
        if student_360.engagement_history:
            total_eng = sum(
                r.events_count + r.clubs_count + r.hackathons_count + r.certifications_count 
                for r in student_360.engagement_history
            )
            scores["engagement"] = min(total_eng * 10.0, 100.0)

        # Placement (average of aptitude, coding, mock_interview)
        if student_360.placement_information:
            avg_place = sum(
                (r.aptitude_score + r.coding_score + r.mock_interview_score) / 3.0
                for r in student_360.placement_information
            ) / len(student_360.placement_information)
            scores["placement"] = avg_place

        # Skills (average of technical, soft)
        if student_360.skills_information:
            avg_skill = sum(
                (r.technical_skill_score + r.soft_skill_score) / 2.0
                for r in student_360.skills_information
            ) / len(student_360.skills_information)
            scores["skills"] = avg_skill

        # Feedback (student_satisfaction 0-5 -> 0-100)
        if student_360.feedback_history:
            avg_feedback = sum(r.student_satisfaction for r in student_360.feedback_history) / len(student_360.feedback_history)
            scores["feedback"] = avg_feedback * 20.0

        return {k: round(v, 2) for k, v in scores.items()}

    def get_or_calculate_success_score(self, student_id: str) -> StudentSuccessScoreResponse:
        # Check if student exists
        student_360 = self.student_360_service.get_student_360(student_id)
        
        domain_scores = self.calculate_domain_scores(student_360)
        
        available_domains = list(domain_scores.keys())
        missing_domains = [d for d in ScoringConfig.DEFAULT_WEIGHTS.keys() if d not in available_domains]

        if not available_domains:
            raise HTTPException(status_code=400, detail="Insufficient data to calculate score")

        # Renormalize weights
        total_available_weight = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in available_domains)
        
        if total_available_weight == 0:
            raise HTTPException(status_code=400, detail="Available domains have 0 weight")

        final_score = sum(
            domain_scores[d] * (ScoringConfig.DEFAULT_WEIGHTS[d] / total_available_weight)
            for d in available_domains
        )
        
        final_score = round(final_score, 2)
        band = ScoringConfig.get_band(final_score)

        # Persist the score
        score_record = self.db.query(StudentSuccessScore).filter_by(student_id=student_id).first()
        if not score_record:
            score_record = StudentSuccessScore(student_id=student_id)
            self.db.add(score_record)
            
        score_record.score = final_score
        score_record.band = band
        score_record.domain_scores = domain_scores
        score_record.available_domains = available_domains
        score_record.missing_domains = missing_domains

        self.db.commit()
        self.db.refresh(score_record)

        # Invalidate related caches AFTER successful transaction
        from backend.app.services.cache import CacheService
        from backend.app.services.pubsub import PubSubService
        
        CacheService.invalidate_tags(["analytics", "segments", "insights", f"student:{student_id}"])
        PubSubService.publish("student_updated", {"student_id": student_id})
        # Note: Future WebSocket layer will interpret "student_updated" as a signal 
        # that analytical averages might have shifted, triggering necessary REST refetches.

        return StudentSuccessScoreResponse(
            student_id=student_id,
            success_score=final_score,
            band=band,
            domain_scores=domain_scores,
            available_domains=available_domains,
            missing_domains=missing_domains
        )
