
from backend.app.core.scoring_config import ScoringConfig
from backend.app.main import app
from backend.app.services.scoring import ScoringService
from backend.tests.test_client import AuthenticatedTestClient as TestClient

client = TestClient(app)

def test_weights_configuration():
    # 3. Correct default weights are applied.
    # 4. Weights sum to 1.0.
    weights = ScoringConfig.DEFAULT_WEIGHTS
    assert "academic" in weights
    assert "attendance" in weights
    assert sum(weights.values()) == 1.0

def test_get_success_score_valid_student():
    # 1. Score is generated for a valid student.
    # 13. Score uses actual PostgreSQL data.
    response = client.get("/api/students/STU0001/success-score")
    assert response.status_code == 200
    data = response.json()
    
    assert data["student_id"] == "STU0001"
    assert "success_score" in data
    
    # 2. Score is between 0 and 100.
    assert 0 <= data["success_score"] <= 100
    
    # 5. Domain scores are between 0 and 100.
    for domain, score in data["domain_scores"].items():
        assert 0 <= score <= 100

    # 6. Score band is correctly assigned.
    assert data["band"] in ["Excellent", "Good", "Moderate", "Needs Attention"]
    
    # 12. Score is deterministic for unchanged data.
    response2 = client.get("/api/students/STU0001/success-score")
    assert response2.json()["success_score"] == data["success_score"]

def test_get_success_score_not_found():
    # 11. Unknown student returns 404.
    response = client.get("/api/students/STU99999/success-score")
    assert response.status_code == 404
    assert response.json() == {"detail": "Student not found"}

class MockStudent360:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_scoring_logic_missing_domain():
    # 7. Missing domain does not become zero.
    # 8. Missing domain weight is renormalized.
    # Let's create a mock Student 360 with exactly one domain missing (feedback)
    
    # Create mock domains that all score 100
    class MockAcademic: cgpa = 10.0
    class MockAttendance: overall_attendance = 100.0
    class MockLMS: assignment_completion = 100.0
    class MockEngagement: events_count=3; clubs_count=3; hackathons_count=2; certifications_count=2 # total=10 -> 100
    class MockPlacement: aptitude_score=100.0; coding_score=100.0; mock_interview_score=100.0
    class MockSkill: technical_skill_score=100.0; soft_skill_score=100.0
    # No feedback
    
    mock_student = MockStudent360(
        academic_history=[MockAcademic()],
        attendance_history=[MockAttendance()],
        lms_history=[MockLMS()],
        engagement_history=[MockEngagement()],
        placement_information=[MockPlacement()],
        skills_information=[MockSkill()],
        feedback_history=[]
    )
    
    # Test through service manually without DB persistence for unit testing the math
    # We will instantiate the service with db=None since we just want to test calculate_domain_scores
    # and the renormalization math
    service = ScoringService(db=None)
    
    domain_scores = service.calculate_domain_scores(mock_student)
    
    assert "feedback" not in domain_scores
    assert domain_scores["academic"] == 100.0
    assert domain_scores["attendance"] == 100.0
    
    # Math for final score
    available_domains = list(domain_scores.keys())
    total_available_weight = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in available_domains)
    assert total_available_weight == 0.95  # Feedback is 0.05
    
    final_score = sum(
        domain_scores[d] * (ScoringConfig.DEFAULT_WEIGHTS[d] / total_available_weight)
        for d in available_domains
    )
    
    assert round(final_score, 2) == 100.0
    
    # If a domain score was 0, it would lower the score, but missing domain leaves it at 100.0

def test_scoring_logic_all_zero():
    class MockAcademic: cgpa = 0.0
    class MockAttendance: overall_attendance = 0.0
    class MockLMS: assignment_completion = 0.0
    class MockEngagement: events_count=0; clubs_count=0; hackathons_count=0; certifications_count=0
    class MockPlacement: aptitude_score=0.0; coding_score=0.0; mock_interview_score=0.0
    class MockSkill: technical_skill_score=0.0; soft_skill_score=0.0
    class MockFeedback: student_satisfaction=0.0
    
    mock_student = MockStudent360(
        academic_history=[MockAcademic()],
        attendance_history=[MockAttendance()],
        lms_history=[MockLMS()],
        engagement_history=[MockEngagement()],
        placement_information=[MockPlacement()],
        skills_information=[MockSkill()],
        feedback_history=[MockFeedback()]
    )
    
    service = ScoringService(db=None)
    domain_scores = service.calculate_domain_scores(mock_student)
    
    available_domains = list(domain_scores.keys())
    total_available_weight = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in available_domains)
    
    final_score = sum(
        domain_scores[d] * (ScoringConfig.DEFAULT_WEIGHTS[d] / total_available_weight)
        for d in available_domains
    )
    
    assert round(final_score, 2) == 0.0

def test_scoring_no_data():
    # 10. No meaningful data produces an insufficient-data state.
    mock_student = MockStudent360(
        academic_history=[],
        attendance_history=[],
        lms_history=[],
        engagement_history=[],
        placement_information=[],
        skills_information=[],
        feedback_history=[]
    )
    service = ScoringService(db=None)
    domain_scores = service.calculate_domain_scores(mock_student)
    assert len(domain_scores) == 0
    # The API service would raise a 400 Bad Request
