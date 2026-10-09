class SegmentationConfig:
    # ---------------------------------------------------------
    # Academic Classification
    # ---------------------------------------------------------
    # A student is HIGH ACADEMIC if:
    # Academic Risk Level is "LOW"
    #
    # A student is LOW ACADEMIC if:
    # Academic Risk Level is "HIGH"
    #
    # MEDIUM Academic Risk is treated as neither High nor Low.
    
    # ---------------------------------------------------------
    # Placement Classification
    # ---------------------------------------------------------
    # High Placement Readiness if:
    # Placement Risk Level is "LOW"
    #
    # Low Placement Readiness if:
    # Placement Risk Level is "HIGH"
    
    # ---------------------------------------------------------
    # Engagement Classification
    # ---------------------------------------------------------
    # Calculated as an Engagement Index based on sums:
    # Index = events_count + clubs_count + hackathons_count + certifications_count
    ENGAGEMENT_HIGH_THRESHOLD = 5  # >= 5 is HIGH engagement
    ENGAGEMENT_LOW_THRESHOLD = 2   # <= 2 is LOW engagement

    # ---------------------------------------------------------
    # Segments Dictionary
    # Priority is determined by the order in this dictionary.
    # The first condition that matches becomes the primary segment.
    # ---------------------------------------------------------
    SEGMENTS = {
        "HIGH_ACADEMIC_LOW_PLACEMENT": {
            "name": "High Academic, Low Placement Readiness",
            "description": "Students demonstrating strong academic performance but elevated placement risk based on configured indicators.",
            "priority": 1
        },
        "LOW_ACADEMIC_HIGH_PLACEMENT": {
            "name": "Low Academic, High Placement Readiness",
            "description": "Students with elevated academic risk but strong placement readiness indicators.",
            "priority": 2
        },
        "HIGH_ENGAGEMENT_LOW_ACADEMIC": {
            "name": "High Engagement, Low Academic",
            "description": "Highly engaged students who are currently facing elevated academic risk.",
            "priority": 3
        },
        "LOW_ENGAGEMENT_LOW_ACADEMIC": {
            "name": "Low Engagement, Low Academic",
            "description": "Students with low campus engagement and elevated academic risk.",
            "priority": 4
        },
        "HIGH_ACADEMIC_HIGH_PLACEMENT": {
            "name": "High Academic, High Placement Readiness",
            "description": "Students demonstrating both strong academic performance and low placement risk.",
            "priority": 5
        },
        "LOW_ACADEMIC_LOW_PLACEMENT": {
            "name": "Low Academic, Low Placement Readiness",
            "description": "Students facing dual risks: elevated academic risk and elevated placement risk.",
            "priority": 6
        }
    }

    @staticmethod
    def classify_engagement(student_360) -> str:
        if not student_360.engagement_history:
            return "UNAVAILABLE"
            
        latest = max(student_360.engagement_history, key=lambda x: (x.academic_year, x.semester))
        
        index = (latest.events_count + 
                 latest.clubs_count + 
                 latest.hackathons_count + 
                 latest.certifications_count)
                 
        if index >= SegmentationConfig.ENGAGEMENT_HIGH_THRESHOLD:
            return "HIGH"
        elif index <= SegmentationConfig.ENGAGEMENT_LOW_THRESHOLD:
            return "LOW"
        else:
            return "MEDIUM"
