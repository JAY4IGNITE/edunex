class AcademicRiskConfig:
    DEFAULT_WEIGHTS = {
        "cgpa": 0.25,
        "internal_marks": 0.20,
        "backlogs": 0.20,
        "subject_performance": 0.15,
        "attendance": 0.10,
        "lms_activity": 0.05,
        "assignment_completion": 0.05
    }

    # Bounded backlog transformation: 5 or more backlogs = 100% risk.
    MAX_BACKLOGS = 5.0
    
    # Bounded LMS activity: 50 logins = 100% activity.
    MAX_LMS_LOGIN = 50.0

    @staticmethod
    def get_risk_level(score: float) -> str:
        if score >= 60.0:
            return "HIGH"
        elif score >= 30.0:
            return "MEDIUM"
        else:
            return "LOW"
