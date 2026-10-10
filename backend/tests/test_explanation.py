from datetime import date

from backend.app.main import app
from backend.app.services.explanation import ExplanationService
from backend.tests.test_client import AuthenticatedTestClient as TestClient

client = TestClient(app)

def test_get_explanation_valid_student():
    response = client.get("/api/students/STU0001/explanation")
    assert response.status_code == 200
    data = response.json()
    
    assert data["student_id"] == "STU0001"
    
    # Success Score Validation
    ss = data["success_score"]
    assert "score" in ss
    assert "band" in ss
    assert "contributors" in ss
    assert "missing_domains" in ss
    
    # Sum of available contributions should match score within a small tolerance
    available_ss = [c for c in ss["contributors"] if c["status"] == "available"]
    total_ss_contrib = sum(c["contribution"] for c in available_ss)
    assert abs(total_ss_contrib - ss["score"]) < 0.1
    
    # Academic Risk Validation
    ar = data["academic_risk"]
    assert "score" in ar
    assert "risk_level" in ar
    assert "drivers" in ar
    assert "protective_indicators" in ar
    
    # Mathematical reconciliation for Risk
    total_ar_contrib = sum(d["risk_contribution"] for d in ar["drivers"] if d["status"] == "available") + \
                       sum(p["risk_contribution"] for p in ar["protective_indicators"] if p["status"] == "available")
    assert abs(total_ar_contrib - ar["score"]) < 0.1

    # Placement Risk Validation
    pr = data["placement_risk"]
    assert "score" in pr
    assert "risk_level" in pr
    assert "drivers" in pr
    assert "assessment_metadata" in pr
    
    total_pr_contrib = sum(d["risk_contribution"] for d in pr["drivers"] if d["status"] == "available") + \
                       sum(p["risk_contribution"] for p in pr["protective_indicators"] if p["status"] == "available")
    assert abs(total_pr_contrib - pr["score"]) < 0.1

def test_get_explanation_not_found():
    response = client.get("/api/students/STU99999/explanation")
    assert response.status_code == 404

class MockAcademic: 
    semester=2; academic_year="2023"; cgpa=10.0; internal_marks=100.0; backlogs=0; subject_performance={"A": 100.0}
class MockAttendance: 
    semester=2; academic_year="2023"; overall_attendance=100.0
class MockLMS: 
    semester=2; academic_year="2023"; login_frequency=50.0; assignment_completion=100.0
class MockEngagement: 
    semester=2; academic_year="2023"; events_count=3; clubs_count=3; hackathons_count=2; certifications_count=2
class MockPlacement: 
    assessment_date=date(2023, 1, 1); aptitude_score=100.0; coding_score=100.0; mock_interview_score=100.0; placement_participation=True
class MockSkill: 
    assessment_date=date(2023, 2, 1); technical_skill_score=100.0; soft_skill_score=100.0
class MockFeedback: 
    semester=2; academic_year="2023"; student_satisfaction=5.0

class MockStudent360:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_explain_perfect_student():
    mock_student = MockStudent360(
        academic_history=[MockAcademic()],
        attendance_history=[MockAttendance()],
        lms_history=[MockLMS()],
        engagement_history=[MockEngagement()],
        placement_information=[MockPlacement()],
        skills_information=[MockSkill()],
        feedback_history=[MockFeedback()]
    )
    
    service = ExplanationService(db=None)
    # Mocking underlying services directly so db isn't queried
    service.student_360_service = type("MockS360", (), {"get_student_360": lambda self, x: mock_student})()
    # Replace internal logic calls that don't depend on db explicitly to evaluate math
    
    # Actually wait, explanation calls service.scoring_service.calculate_domain_scores etc.
    # Those don't hit the DB! So this works perfectly.
    
    explanation = service.get_explanation("TEST")
    
    # Perfect student = 100 Success Score, 0 Risk
    assert explanation.success_score.score == 100.0
    assert explanation.academic_risk.score == 0.0
    assert explanation.placement_risk.score == 0.0
    
    # All signals should be available
    assert len(explanation.success_score.missing_domains) == 0
    assert len(explanation.academic_risk.missing_signals) == 0
    assert len(explanation.placement_risk.missing_signals) == 0

def test_explain_missing_data():
    mock_student = MockStudent360(
        academic_history=[MockAcademic()],
        attendance_history=[MockAttendance()],
        lms_history=[MockLMS()],
        engagement_history=[MockEngagement()],
        placement_information=[MockPlacement()],
        skills_information=[MockSkill()],
        feedback_history=[] # Missing feedback
    )
    
    service = ExplanationService(db=None)
    service.student_360_service = type("MockS360", (), {"get_student_360": lambda self, x: mock_student})()
    
    explanation = service.get_explanation("TEST")
    
    # Feedback missing
    assert "feedback" in explanation.success_score.missing_domains
    
    # The effective weight of academic should be adjusted from 0.25 to 0.25/0.95 = ~0.2632
    academic_contrib = next(c for c in explanation.success_score.contributors if c.name == "academic")
    assert academic_contrib.effective_weight == round(0.25 / 0.95, 4)
