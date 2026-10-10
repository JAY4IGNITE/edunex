from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.core.academic_risk_config import AcademicRiskConfig
from backend.app.core.placement_risk_config import PlacementRiskConfig
from backend.app.core.scoring_config import ScoringConfig
from backend.app.schemas.explanation import (
    AcademicRiskExplanation,
    DomainContributor,
    ExplanationResponse,
    PlacementRiskExplanation,
    RiskDriver,
    SuccessScoreExplanation,
)
from backend.app.services.academic_risk import AcademicRiskService
from backend.app.services.placement_risk import PlacementRiskService
from backend.app.services.scoring import ScoringService
from backend.app.services.student_360 import Student360Service


class ExplanationService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)
        self.scoring_service = ScoringService(db)
        self.academic_risk_service = AcademicRiskService(db)
        self.placement_risk_service = PlacementRiskService(db)

    def _explain_success_score(self, student_360) -> SuccessScoreExplanation:
        domain_scores = self.scoring_service.calculate_domain_scores(student_360)
        available_domains = list(domain_scores.keys())
        missing_domains = [d for d in ScoringConfig.DEFAULT_WEIGHTS.keys() if d not in available_domains]

        if not available_domains:
            raise HTTPException(status_code=400, detail="Insufficient data to calculate success score explanation")

        total_available_weight = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in available_domains)
        if total_available_weight == 0:
            raise HTTPException(status_code=400, detail="Available domains have 0 weight")

        contributors = []
        final_score = 0.0

        for domain, default_weight in ScoringConfig.DEFAULT_WEIGHTS.items():
            if domain in available_domains:
                normalized_value = domain_scores[domain]
                effective_weight = default_weight / total_available_weight
                contribution = normalized_value * effective_weight
                final_score += contribution
                
                # Determine direction: since higher is better, high score is positive
                direction = "positive" if contribution > (50.0 * effective_weight) else "negative"
                
                contributors.append(DomainContributor(
                    name=domain,
                    status="available",
                    excluded_from_calculation=False,
                    configured_weight=default_weight,
                    effective_weight=round(effective_weight, 4),
                    normalized_value=normalized_value,
                    contribution=round(contribution, 2),
                    direction=direction
                ))
            else:
                contributors.append(DomainContributor(
                    name=domain,
                    status="unavailable",
                    excluded_from_calculation=True,
                    configured_weight=default_weight,
                    effective_weight=0.0
                ))

        # Sort available contributors by contribution (descending)
        available_contribs = sorted([c for c in contributors if c.status == "available"], key=lambda x: x.contribution, reverse=True)
        missing_contribs = [c for c in contributors if c.status == "unavailable"]
        
        final_score = round(final_score, 2)
        band = ScoringConfig.get_band(final_score)

        return SuccessScoreExplanation(
            score=final_score,
            band=band,
            contributors=available_contribs + missing_contribs,
            missing_domains=missing_domains
        )

    def _explain_risk(self, signal_risks, config_weights, get_risk_level, assessment_meta) -> tuple[float, str, list, list, list]:
        available_signals = list(signal_risks.keys())
        missing_signals = [s for s in config_weights.keys() if s not in available_signals]

        if not available_signals:
            raise HTTPException(status_code=400, detail="Insufficient data to calculate risk explanation")

        total_available_weight = sum(config_weights[s] for s in available_signals)
        if total_available_weight == 0:
            raise HTTPException(status_code=400, detail="Available signals have 0 weight")

        drivers = []
        protective_indicators = []
        missing_list = []
        final_risk = 0.0

        for signal, default_weight in config_weights.items():
            if signal in available_signals:
                normalized_risk = signal_risks[signal]
                effective_weight = default_weight / total_available_weight
                risk_contribution = normalized_risk * effective_weight
                final_risk += risk_contribution
                
                driver_obj = RiskDriver(
                    name=signal,
                    status="available",
                    excluded_from_calculation=False,
                    configured_weight=default_weight,
                    effective_weight=round(effective_weight, 4),
                    normalized_value=normalized_risk,
                    risk_contribution=round(risk_contribution, 2)
                )
                
                # Higher risk contribution -> driver. Lower risk contribution -> protective.
                # Threshold arbitrary: > average contribution is driver, else protective
                avg_contrib = 50.0 * effective_weight
                if risk_contribution >= avg_contrib:
                    drivers.append(driver_obj)
                else:
                    protective_indicators.append(driver_obj)
            else:
                missing_list.append(RiskDriver(
                    name=signal,
                    status="unavailable",
                    excluded_from_calculation=True,
                    configured_weight=default_weight,
                    effective_weight=0.0
                ))

        # Sort drivers by highest risk contribution
        drivers = sorted(drivers, key=lambda x: x.risk_contribution, reverse=True)
        # Sort protective indicators by lowest risk contribution (best protectors first)
        protective_indicators = sorted(protective_indicators, key=lambda x: x.risk_contribution)

        final_risk = round(final_risk, 2)
        risk_level = get_risk_level(final_risk)

        return final_risk, risk_level, drivers, protective_indicators, missing_signals, missing_list

    def _explain_academic_risk(self, student_360) -> AcademicRiskExplanation:
        signal_risks, assessment_period = self.academic_risk_service.calculate_signal_risks(student_360)
        
        final_risk, risk_level, drivers, protective, missing_signals, missing_objs = self._explain_risk(
            signal_risks, 
            AcademicRiskConfig.DEFAULT_WEIGHTS, 
            AcademicRiskConfig.get_risk_level, 
            assessment_period
        )
        
        # Merge missing back into drivers list for full visibility if needed, or keep separate
        # Schema separates drivers and protective, missing_signals is just list of strings, but we can append missing_objs to drivers or protective. 
        # Schema definition doesn't have a missing_objs list, let's put them in missing_signals and maybe drivers if it helps tracing.
        # Wait, the prompt says explicitly: "missing information must be explicitly represented... Status: unavailable". 
        # We'll just put unavailable drivers at the bottom of the drivers list.
        all_drivers = drivers + missing_objs

        return AcademicRiskExplanation(
            score=final_risk,
            risk_level=risk_level,
            drivers=all_drivers,
            protective_indicators=protective,
            missing_signals=missing_signals,
            assessment_period=assessment_period
        )

    def _explain_placement_risk(self, student_360) -> PlacementRiskExplanation:
        signal_risks, assessment_metadata = self.placement_risk_service.calculate_signal_risks(student_360)
        
        final_risk, risk_level, drivers, protective, missing_signals, missing_objs = self._explain_risk(
            signal_risks, 
            PlacementRiskConfig.DEFAULT_WEIGHTS, 
            PlacementRiskConfig.get_risk_level, 
            assessment_metadata
        )

        all_drivers = drivers + missing_objs

        return PlacementRiskExplanation(
            score=final_risk,
            risk_level=risk_level,
            drivers=all_drivers,
            protective_indicators=protective,
            missing_signals=missing_signals,
            assessment_metadata=assessment_metadata
        )

    def get_explanation(self, student_id: str) -> ExplanationResponse:
        student_360 = self.student_360_service.get_student_360(student_id)

        success_exp = self._explain_success_score(student_360)
        acad_exp = self._explain_academic_risk(student_360)
        place_exp = self._explain_placement_risk(student_360)

        return ExplanationResponse(
            student_id=student_id,
            success_score=success_exp,
            academic_risk=acad_exp,
            placement_risk=place_exp
        )
