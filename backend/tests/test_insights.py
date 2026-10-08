from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.insight import InsightService
from backend.app.core.insight_config import InsightConfig
import pytest

client = TestClient(app)

class MockStudent:
    def __init__(self, sid):
        self.student_id = sid
        self.department = "CSE"
        self.year = 2024
        self.semester = 1

def test_get_insights_valid(monkeypatch):
    def _mock_query(self, *args):
        is_student_id = False
        if args and len(args) == 1 and hasattr(args[0], "name") and args[0].name == "student_id":
            is_student_id = True
            
        class MockQuery:
            def filter(self, *a): return self
            def options(self, *a): return self
            def all(self):
                if is_student_id:
                    return [(f"STU{i}",) for i in range(InsightConfig.MIN_COHORT_SIZE + 5)]
                else:
                    val = "HIGH_ACADEMIC_LOW_PLACEMENT"
                    if len(args) > 1 and hasattr(args[1], "name"):
                        if args[1].name == "risk_level": val = "HIGH"
                        elif args[1].name == "score": val = 85.0
                    return [(f"STU{i}", val) for i in range(InsightConfig.MIN_COHORT_SIZE + 5)]
        return MockQuery()

    monkeypatch.setattr("backend.app.services.insight.Session.query", _mock_query)
    
    monkeypatch.setattr("backend.app.services.placement_risk.PlacementRiskService.get_or_calculate_placement_risk", 
                        lambda self, sid: type("MockPR", (), {"risk_level": "LOW"})())
    
    monkeypatch.setattr("backend.app.services.scoring.ScoringService.get_or_calculate_success_score", 
                        lambda self, sid: type("MockSS", (), {"success_score": 85.0})())
    
    monkeypatch.setattr("backend.app.services.segmentation.SegmentationService.classify_student", 
                        lambda self, sid: type("MockSeg", (), {"primary_segment": "HIGH_ACADEMIC_LOW_PLACEMENT"})())
    
    # Mock Student 360 to return some history to trigger trend generation
    class MockS360:
        student_id = "test"
        department = "test"
        year = 2024
        semester = 1
        section = "A"
        academic_year = "2024"
        academic_history = [type("Mock", (), {"semester": 1, "cgpa": 8.0, "internal_marks": 80, "backlogs": 0})(), type("Mock", (), {"semester": 2, "cgpa": 8.5, "internal_marks": 85, "backlogs": 0})()]
        attendance_history = [type("Mock", (), {"semester": 1, "overall_attendance": 90})(), type("Mock", (), {"semester": 2, "overall_attendance": 80})()]
        lms_history = []
        engagement_history = [type("Mock", (), {"semester": 1, "events_count": 2, "clubs_count": 1, "hackathons_count": 1, "certifications_count": 1})()]
        placement_information = []
        skills_information = []
        feedback_history = []
        
    monkeypatch.setattr("backend.app.services.student_360.Student360Service.get_student_360",
                        lambda self, sid: MockS360())
    
    class MockS360Response:
        def __init__(self, s):
            self.student = type("Mock", (), {"student_id": s})()
            self.academic_history = MockS360.academic_history
            self.attendance_history = MockS360.attendance_history
            self.lms_history = MockS360.lms_history
            self.engagement_history = MockS360.engagement_history
            self.placement_information = MockS360.placement_information
            self.skills_information = MockS360.skills_information
            self.feedback_history = MockS360.feedback_history
            
    monkeypatch.setattr("backend.app.services.student_360.Student360Service.get_students_360_bulk",
                        lambda self, sids: [MockS360Response(sid) for sid in sids])

    response = client.get("/api/insights")
    assert response.status_code == 200
    data = response.json()
    assert data["population_size"] >= InsightConfig.MIN_COHORT_SIZE
    
    insights = data["insights"]
    assert len(insights) > 0
    category_set = {i["category"] for i in insights}
    assert InsightConfig.CATEGORIES["ACADEMIC_RISK"] in category_set
    assert InsightConfig.CATEGORIES["PLACEMENT_RISK"] in category_set
    assert InsightConfig.CATEGORIES["COMPARATIVE"] in category_set
    assert InsightConfig.CATEGORIES["ENGAGEMENT"] in category_set
    assert InsightConfig.CATEGORIES["TRENDS"] in category_set

def test_get_insights_insufficient_sample(monkeypatch):
    monkeypatch.setattr("backend.app.services.insight.Session.query", lambda self, *args: type("MockQuery", (), {
        "all": lambda self: [("STU001",) for _ in range(InsightConfig.MIN_COHORT_SIZE - 2)],
        "filter": lambda self, *a: self
    })())
    
    response = client.get("/api/insights?department=CSE")
    assert response.status_code == 200
    data = response.json()
    
    assert data["population_size"] < InsightConfig.MIN_COHORT_SIZE
    assert len(data["insights"]) == 1
    assert data["insights"][0]["insufficient_sample"] is True

def test_get_insights_filtered_comparative(monkeypatch):
    def _mock_query(self, *args):
        is_student_id = False
        if args and len(args) == 1 and hasattr(args[0], "name") and args[0].name == "student_id":
            is_student_id = True
            
        class MockQuery:
            def filter(self, *a): return self
            def options(self, *a): return self
            def all(self):
                if is_student_id:
                    return [(f"STU{i}",) for i in range(InsightConfig.MIN_COHORT_SIZE + 5)]
                else:
                    val = "HIGH_ACADEMIC_LOW_PLACEMENT"
                    if len(args) > 1 and hasattr(args[1], "name"):
                        if args[1].name == "risk_level": val = "HIGH"
                        elif args[1].name == "score": val = 85.0
                    return [(f"STU{i}", val) for i in range(InsightConfig.MIN_COHORT_SIZE + 5)]
        return MockQuery()

    monkeypatch.setattr("backend.app.services.insight.Session.query", _mock_query)
    
    monkeypatch.setattr("backend.app.services.academic_risk.AcademicRiskService.get_or_calculate_academic_risk", 
                        lambda self, sid: type("MockAR", (), {"risk_level": "HIGH"})())
    monkeypatch.setattr("backend.app.services.placement_risk.PlacementRiskService.get_or_calculate_placement_risk", 
                        lambda self, sid: type("MockPR", (), {"risk_level": "LOW"})())
    monkeypatch.setattr("backend.app.services.scoring.ScoringService.get_or_calculate_success_score", 
                        lambda self, sid: type("MockSS", (), {"success_score": 85.0})())
    monkeypatch.setattr("backend.app.services.segmentation.SegmentationService.classify_student", 
                        lambda self, sid: type("MockSeg", (), {"primary_segment": "HIGH_ACADEMIC_LOW_PLACEMENT"})())
    monkeypatch.setattr("backend.app.services.student_360.Student360Service.get_student_360",
                        lambda self, sid: type("Mock", (), {"engagement_history": [], "attendance_history": [], "academic_history": []})())
    
    class MockS360Response:
        def __init__(self, s):
            self.student = type("Mock", (), {"student_id": s})()
            self.academic_history = []
            self.attendance_history = []
            self.lms_history = []
            self.engagement_history = []
            self.placement_information = []
            self.skills_information = []
            self.feedback_history = []
    
    monkeypatch.setattr("backend.app.services.student_360.Student360Service.get_students_360_bulk",
                        lambda self, sids: [MockS360Response(sid) for sid in sids])
    
    response = client.get("/api/insights?department=CSE")
    assert response.status_code == 200
    data = response.json()
    assert data["applied_filters"]["department"] == "CSE"
    
    # We should have a comparative insight against institution baseline
    insights = data["insights"]
    comp_insight = next(i for i in insights if i["insight_id"] == "SUCCESS_COMP_01")
    assert comp_insight["comparison_value"] == 85.0

def test_get_insights_raises_unexpected_exception(monkeypatch):
    monkeypatch.setattr("backend.app.services.insight.Session.query", lambda self, *args: type("MockQuery", (), {
        "all": lambda self: [(f"STU{i}",) for i in range(InsightConfig.MIN_COHORT_SIZE + 5)],
        "filter": lambda self, *a: self,
        "options": lambda self, *a: self
    })())
    
    def mock_programming_error(self, sids):
        raise ValueError("Unexpected programming error!")
        
    monkeypatch.setattr("backend.app.services.student_360.Student360Service.get_students_360_bulk", mock_programming_error)
    
    with pytest.raises(ValueError, match="Unexpected programming error!"):
        client.get("/api/insights")
