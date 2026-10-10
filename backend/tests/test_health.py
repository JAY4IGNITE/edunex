from contextlib import nullcontext
from sqlalchemy.exc import SQLAlchemyError
from backend.app.main import engine, health


def test_health_checks_database_readiness(monkeypatch):
    class Connection:
        def execute(self, statement):
            assert str(statement) == "SELECT 1"

    monkeypatch.setattr(engine, "connect", lambda: nullcontext(Connection()))
    assert health() == {
        "status": "ok",
        "service": "campuspulse-ai",
        "database": "ready",
    }


def test_health_reports_database_unavailable(monkeypatch):
    def fail_connect():
        raise SQLAlchemyError("private connection details")

    monkeypatch.setattr(engine, "connect", fail_connect)
    response = health()
    assert response.status_code == 503
    assert response.body == b'{"status":"not_ready","service":"campuspulse-ai","database":"unavailable"}'
