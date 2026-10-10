from backend.tests.test_client import AuthenticatedTestClient as TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_student_360_success():
    # Since we loaded data in Phase 4, STU0001 should exist
    response = client.get("/api/students/STU0001")
    assert response.status_code == 200
    data = response.json()
    
    # 2. Student identity is correct.
    assert "student" in data
    assert data["student"]["student_id"] == "STU0001"
    
    # 3-9. Check all 7 domains
    assert "academic_history" in data
    assert isinstance(data["academic_history"], list)
    assert len(data["academic_history"]) > 0

    assert "attendance_history" in data
    assert isinstance(data["attendance_history"], list)
    assert len(data["attendance_history"]) > 0

    assert "lms_history" in data
    assert isinstance(data["lms_history"], list)
    assert len(data["lms_history"]) > 0

    assert "engagement_history" in data
    assert isinstance(data["engagement_history"], list)
    assert len(data["engagement_history"]) > 0

    assert "placement_information" in data
    assert isinstance(data["placement_information"], list)

    assert "skills_information" in data
    assert isinstance(data["skills_information"], list)

    assert "feedback_history" in data
    assert isinstance(data["feedback_history"], list)
    assert len(data["feedback_history"]) > 0

    # 10. Historical periods are preserved
    # E.g., multiple academic records for the same student
    if len(data["academic_history"]) > 1:
        semesters = [record["semester"] for record in data["academic_history"]]
        assert len(set(semesters)) > 1  # Should have multiple distinct semesters

    # 11. Placement/skill assessment dates are preserved
    if data["placement_information"]:
        assert "assessment_date" in data["placement_information"][0]
    if data["skills_information"]:
        assert "assessment_date" in data["skills_information"][0]

def test_get_student_360_not_found():
    # 12. Unknown student returns 404
    response = client.get("/api/students/STU99999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Student not found"}
