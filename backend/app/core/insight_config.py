class InsightConfig:
    # Minimum population needed to generate comparative insights
    # to protect against small-sample skew
    MIN_COHORT_SIZE = 10
    
    # Threshold for High Risk Severity Flag
    HIGH_RISK_PERCENTAGE_THRESHOLD = 20.0
    
    # Priority Levels
    PRIORITY_HIGH = "HIGH"
    PRIORITY_MEDIUM = "MEDIUM"
    PRIORITY_LOW = "LOW"
    PRIORITY_INFO = "INFO"
    
    CATEGORIES = {
        "ACADEMIC_RISK": "Academic Risk",
        "PLACEMENT_RISK": "Placement Risk",
        "STUDENT_SUCCESS": "Student Success",
        "ACADEMIC_VS_PLACEMENT": "Academic vs Placement Readiness",
        "ENGAGEMENT": "Engagement",
        "TRENDS": "Longitudinal Trends",
        "COMPARATIVE": "Comparative Analysis"
    }
