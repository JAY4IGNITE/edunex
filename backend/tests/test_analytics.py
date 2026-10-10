from backend.tests.test_client import AuthenticatedTestClient as TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_analytics_overview(monkeypatch):
    # Mocking out the InsightService logic so we don't query the real DB
    def mock_gather_metrics(self, department, year, semester):
        return {
            "applied_filters": {"department": department} if department else {},
            "population_size": 25,
            "academic_risks": ["HIGH", "LOW"],
            "placement_risks": ["LOW", "LOW"],
            "success_scores": [80.0, 90.0],
            "segments": {"HIGH_ENGAGEMENT_LOW_ACADEMIC": 1},
            "engagement_indices": [5.0, 10.0],
            "high_eng_low_acad": 1,
            "low_eng_low_acad": 0,
            "semester_attendance": {"Sem-1": [90.0, 85.0]},
            "semester_engagement": {"Sem-1": [5, 10]},
            "semester_success": {"Sem-1": [80.0, 90.0]}
        }
    monkeypatch.setattr("backend.app.services.insight.InsightService._gather_metrics", mock_gather_metrics)

    response = client.get("/api/analytics/overview?department=CSE")
    assert response.status_code == 200
    data = response.json()
    assert data["total_students"] == 25
    assert data["average_success_score"] == 85.0
    assert data["average_attendance"] == 87.5
    assert data["average_engagement_index"] == 7.5
    assert "success_score_distribution" in data
    assert "academic_risk_distribution" in data
    assert "placement_risk_distribution" in data
    assert "segment_distribution" in data

def test_get_analytics_distribution(monkeypatch):
    def mock_gather_metrics(self, department, year, semester):
        return {
            "applied_filters": {},
            "population_size": 10,
            "academic_risks": ["HIGH", "LOW", "LOW"],
            "placement_risks": ["MEDIUM", "LOW", "LOW"],
            "success_scores": [80.0, 90.0],
            "segments": {"HIGH_ACADEMIC_LOW_PLACEMENT": 2, "BALANCED": 1},
            "engagement_indices": [],
            "high_eng_low_acad": 0,
            "low_eng_low_acad": 0,
            "semester_attendance": {},
            "semester_engagement": {},
            "semester_success": {}
        }
    monkeypatch.setattr("backend.app.services.insight.InsightService._gather_metrics", mock_gather_metrics)

    response = client.get("/api/analytics/distribution")
    assert response.status_code == 200
    data = response.json()
    assert data["academic_risk_distribution"]["HIGH"] == 1
    assert data["academic_risk_distribution"]["LOW"] == 2
    assert data["placement_risk_distribution"]["MEDIUM"] == 1
    assert data["segment_distribution"]["BALANCED"] == 1
    assert data["success_score_distribution"]["Excellent"] == 2

def test_get_analytics_trends(monkeypatch):
    def mock_gather_metrics(self, department, year, semester):
        return {
            "applied_filters": {},
            "population_size": 20,
            "academic_risks": [],
            "placement_risks": [],
            "success_scores": [],
            "segments": {},
            "engagement_indices": [],
            "high_eng_low_acad": 0,
            "low_eng_low_acad": 0,
            "semester_attendance": {"Sem-1": [90.0]*15, "Sem-2": [80.0]*15},
            "semester_engagement": {"Sem-1": [5]*15, "Sem-2": [10]*15},
            "semester_success": {"Sem-1": [85.0]*15, "Sem-2": [88.0]*15}
        }
    monkeypatch.setattr("backend.app.services.insight.InsightService._gather_metrics", mock_gather_metrics)

    response = client.get("/api/analytics/trends")
    assert response.status_code == 200
    data = response.json()
    assert data["success_score_trends"]["Sem-1"] == 85.0
    assert data["attendance_trends"]["Sem-2"] == 80.0
    assert data["engagement_trends"]["Sem-2"] == 10.0
