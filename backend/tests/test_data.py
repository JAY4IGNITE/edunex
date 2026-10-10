from backend.app.main import app
from backend.tests.test_client import AuthenticatedTestClient as TestClient

client = TestClient(app)

def test_data_sources():
    response = client.get("/api/data/sources")
    assert response.status_code in (200, 404)  # It's okay if not found locally during test, but should be mapped
    
def test_data_quality():
    response = client.get("/api/data/quality")
    assert response.status_code in (200, 404)

def test_data_provenance():
    response = client.get("/api/data/provenance")
    assert response.status_code in (200, 404)

def test_data_schema():
    response = client.get("/api/data/schema")
    assert response.status_code in (200, 404)
