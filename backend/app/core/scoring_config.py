class ScoringConfig:
    # Default initial CampusPulse analytical weights
    DEFAULT_WEIGHTS = {
        "academic": 0.25,
        "attendance": 0.15,
        "lms": 0.15,
        "engagement": 0.10,
        "placement": 0.20,
        "skills": 0.10,
        "feedback": 0.05
    }

    @staticmethod
    def get_band(score: float) -> str:
        if score >= 80.0:
            return "Excellent"
        elif score >= 65.0:
            return "Good"
        elif score >= 50.0:
            return "Moderate"
        else:
            return "Needs Attention"
