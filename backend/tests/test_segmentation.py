from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.segmentation import SegmentationService
from backend.app.schemas.student_360 import Student360Response
from backend.app.schemas.academic_risk import AcademicRiskResponse
from backend.app.schemas.placement_risk import PlacementRiskResponse
import pytest

client = TestClient(app)

class MockStudent360:
    def __init__(self, eng_index):
        class MockEng:
            semester = 2
            events_count = eng_index
            clubs_count = 0
            hackathons_count = 0
            certifications_count = 0
        self.engagement_history = [MockEng()] if eng_index is not None else []

def setup_mock_service(acad_level, place_level, eng_index):
    service = SegmentationService(db=None)
    
    service.student_360_service = type("Mock", (), {
        "get_student_360": lambda self, x: MockStudent360(eng_index)
    })()
    
    def mock_acad(x):
        if acad_level == "UNAVAILABLE": raise HTTPException(status_code=400, detail="No data")
        return AcademicRiskResponse(student_id=x, academic_risk_score=50, risk_level=acad_level, available_signals=[], missing_signals=[])
    service.academic_risk_service = type("Mock", (), {"get_or_calculate_academic_risk": lambda self, x: mock_acad(x)})()
    
    def mock_place(x):
        if place_level == "UNAVAILABLE": raise HTTPException(status_code=400, detail="No data")
        return PlacementRiskResponse(student_id=x, placement_risk_score=50, risk_level=place_level, available_signals=[], missing_signals=[], assessment_metadata={"placement_assessment_date": None, "skills_assessment_date": None})
    service.placement_risk_service = type("Mock", (), {"get_or_calculate_placement_risk": lambda self, x: mock_place(x)})()

    return service

def test_segments_criteria():
    # 1. HIGH_ACADEMIC_HIGH_PLACEMENT
    s = setup_mock_service("LOW", "LOW", 3).classify_student("TEST")
    assert s.primary_segment == "HIGH_ACADEMIC_HIGH_PLACEMENT"

    # 2. HIGH_ACADEMIC_LOW_PLACEMENT
    s = setup_mock_service("LOW", "HIGH", 3).classify_student("TEST")
    assert s.primary_segment == "HIGH_ACADEMIC_LOW_PLACEMENT"

    # 3. LOW_ACADEMIC_HIGH_PLACEMENT
    s = setup_mock_service("HIGH", "LOW", 3).classify_student("TEST")
    assert s.primary_segment == "LOW_ACADEMIC_HIGH_PLACEMENT"

    # 4. LOW_ACADEMIC_LOW_PLACEMENT
    # Wait, LOW/LOW might trigger LOW_ENGAGEMENT_LOW_ACADEMIC if engagement is low.
    # Let's set engagement to medium (3)
    s = setup_mock_service("HIGH", "HIGH", 3).classify_student("TEST")
    assert s.primary_segment == "LOW_ACADEMIC_LOW_PLACEMENT"

    # 5. HIGH_ENGAGEMENT_LOW_ACADEMIC
    # Priority 3 over LOW_ACADEMIC_LOW_PLACEMENT
    s = setup_mock_service("HIGH", "HIGH", 10).classify_student("TEST")
    assert s.primary_segment == "HIGH_ENGAGEMENT_LOW_ACADEMIC"

    # 6. LOW_ENGAGEMENT_LOW_ACADEMIC
    # Priority 4 over LOW_ACADEMIC_LOW_PLACEMENT
    s = setup_mock_service("HIGH", "HIGH", 1).classify_student("TEST")
    assert s.primary_segment == "LOW_ENGAGEMENT_LOW_ACADEMIC"

def test_missing_data_segmentation():
    # If missing placement, we can't be in a placement segment
    s = setup_mock_service("LOW", "UNAVAILABLE", 3).classify_student("TEST")
    assert s.primary_segment is None

    # If missing academic, we can't be in an academic segment
    s = setup_mock_service("UNAVAILABLE", "LOW", 3).classify_student("TEST")
    assert s.primary_segment is None

def test_get_segments_api(monkeypatch):
    monkeypatch.setattr(SegmentationService, "_get_all_student_ids", lambda self, d=None, y=None, s=None: ["STU0001", "STU0002"])
    response = client.get("/api/segments")
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "segments" in data
    assert len(data["segments"]) == 6

def test_get_segment_detail_api(monkeypatch):
    monkeypatch.setattr(SegmentationService, "_get_all_student_ids", lambda self, d=None, y=None, s=None: ["STU0001"])
    response = client.get("/api/segments/HIGH_ACADEMIC_LOW_PLACEMENT")
    assert response.status_code == 200
    data = response.json()
    assert data["segment_id"] == "HIGH_ACADEMIC_LOW_PLACEMENT"
    assert "characteristics" in data
    assert "students" in data

def test_get_segment_detail_not_found():
    response = client.get("/api/segments/UNKNOWN_SEGMENT")
    assert response.status_code == 404
