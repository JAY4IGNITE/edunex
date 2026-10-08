class PlacementRiskConfig:
    DEFAULT_WEIGHTS = {
        "aptitude_score": 0.20,
        "coding_score": 0.25,
        "mock_interview_score": 0.20,
        "technical_skill_score": 0.15,
        "soft_skill_score": 0.10,
        "placement_participation": 0.10
    }

    @staticmethod
    def get_risk_level(score: float) -> str:
        if score >= 60.0:
            return "HIGH"
        elif score >= 30.0:
            return "MEDIUM"
        else:
            return "LOW"
