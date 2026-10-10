from backend.app.main import app
from backend.tests.test_client import AuthenticatedTestClient as TestClient

client = TestClient(app)

def test_list_students_no_filters():
    response = client.get("/api/students")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 100 # default limit

def test_list_students_with_filters():
    response = client.get("/api/students?department=CSE&year=3")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert data[0]["department"] == "CSE"
        assert data[0]["year"] == 3
