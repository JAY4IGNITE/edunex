from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.core.placement_risk_config import PlacementRiskConfig
from backend.app.models.placement_risk import PlacementRiskScore
from backend.app.services.student_360 import Student360Service
from backend.app.schemas.placement_risk import PlacementRiskResponse, AssessmentMetadata

class PlacementRiskService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)

    def _get_latest_record(self, records):
        if not records:
            return None
        return max(records, key=lambda x: x.assessment_date)

    def calculate_signal_risks(self, student_360) -> tuple[dict, AssessmentMetadata]:
        latest_placement = self._get_latest_record(student_360.placement_information)
        latest_skills = self._get_latest_record(student_360.skills_information)

        if not latest_placement and not latest_skills:
            return {}, AssessmentMetadata()

        assessment_metadata = AssessmentMetadata(
            placement_assessment_date=latest_placement.assessment_date if latest_placement else None,
            skills_assessment_date=latest_skills.assessment_date if latest_skills else None
        )

        signal_risks = {}
        
        # Placement Signals (Positive, 0-100 -> Risk: 100 - score)
        if latest_placement:
            signal_risks["aptitude_score"] = 100.0 - latest_placement.aptitude_score
            signal_risks["coding_score"] = 100.0 - latest_placement.coding_score
            signal_risks["mock_interview_score"] = 100.0 - latest_placement.mock_interview_score
            
            # Placement Participation (Boolean -> True=0 risk, False=100 risk)
            signal_risks["placement_participation"] = 0.0 if latest_placement.placement_participation else 100.0

        # Skills Signals (Positive, 0-100 -> Risk: 100 - score)
        if latest_skills:
            signal_risks["technical_skill_score"] = 100.0 - latest_skills.technical_skill_score
            signal_risks["soft_skill_score"] = 100.0 - latest_skills.soft_skill_score

        return {k: round(v, 2) for k, v in signal_risks.items()}, assessment_metadata

    def get_or_calculate_placement_risk(self, student_id: str) -> PlacementRiskResponse:
        score_record = self.db.query(PlacementRiskScore).filter_by(student_id=student_id).first()
        if score_record:
            return PlacementRiskResponse(
                student_id=student_id,
                placement_risk_score=score_record.placement_risk_score,
                risk_level=score_record.risk_level,
                available_signals=score_record.available_signals,
                missing_signals=score_record.missing_signals,
                assessment_metadata=AssessmentMetadata(**score_record.assessment_metadata) if score_record.assessment_metadata else AssessmentMetadata()
            )

        student_360 = self.student_360_service.get_student_360(student_id)

        signal_risks, assessment_metadata = self.calculate_signal_risks(student_360)

        available_signals = list(signal_risks.keys())
        missing_signals = [s for s in PlacementRiskConfig.DEFAULT_WEIGHTS.keys() if s not in available_signals]

        if not available_signals:
            raise HTTPException(status_code=400, detail="Insufficient data to calculate placement risk")

        total_available_weight = sum(PlacementRiskConfig.DEFAULT_WEIGHTS[s] for s in available_signals)
        
        if total_available_weight == 0:
            raise HTTPException(status_code=400, detail="Available signals have 0 weight")

        final_risk_score = sum(
            signal_risks[s] * (PlacementRiskConfig.DEFAULT_WEIGHTS[s] / total_available_weight)
            for s in available_signals
        )

        final_risk_score = round(final_risk_score, 2)
        risk_level = PlacementRiskConfig.get_risk_level(final_risk_score)

        # Persist
        score_record = self.db.query(PlacementRiskScore).filter_by(student_id=student_id).first()
        if not score_record:
            score_record = PlacementRiskScore(student_id=student_id)
            self.db.add(score_record)
            
        score_record.placement_risk_score = final_risk_score
        score_record.risk_level = risk_level
        score_record.available_signals = available_signals
        score_record.missing_signals = missing_signals
        score_record.assessment_metadata = assessment_metadata.model_dump(mode="json")

        self.db.commit()
        self.db.refresh(score_record)

        # Invalidate related caches AFTER successful transaction
        from backend.app.services.cache import CacheService
        from backend.app.services.pubsub import PubSubService
        
        CacheService.invalidate_tags(["analytics", "segments", "insights", f"student:{student_id}"])
        PubSubService.publish("student_updated", {"student_id": student_id})

        return PlacementRiskResponse(
            student_id=student_id,
            placement_risk_score=final_risk_score,
            risk_level=risk_level,
            available_signals=available_signals,
            missing_signals=missing_signals,
            assessment_metadata=assessment_metadata
        )
