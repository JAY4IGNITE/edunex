"""Real Redis HIT/MISS/invalidation/outage checks on disposable local services."""
import json
import time
import sys
from pathlib import Path
from unittest.mock import patch
import redis
from fastapi.testclient import TestClient
from sqlalchemy import event
from backend.app.core.database import engine
from backend.app.core.redis import redis_manager
from backend.app.core.config import settings
from backend.app.main import app
from backend.app.services.cache import CacheService


def main():
    if engine.url.host not in ("localhost", "127.0.0.1") or engine.url.database != "edunex_perf":
        raise SystemExit("Use disposable local edunex_perf database")
    if settings.redis_url != "redis://127.0.0.1:56379/15?protocol=2":
        raise SystemExit("Use isolated redis://127.0.0.1:56379/15?protocol=2")
    statements = []
    event.listen(engine, "after_cursor_execute", lambda *args: statements.append(True))
    report = {"environment": "isolated local PostgreSQL and Redis; test-only RESP2 for installed Windows Redis", "checks": {}}
    with TestClient(app) as client:
        client.post("/api/auth/session", json={"user_id": "dean-demo"}, headers={"X-Requested-With": "EduNex"}).raise_for_status()
        assert redis_manager.client is not None, "Isolated Redis did not start"
        report["redis_version"] = redis_manager.client.info()["redis_version"]
        for path in ("overview", "distribution"):
            CacheService.invalidate_tags(["analytics"])
            original = None
            for label in ("miss", "hit", "invalidated", "disabled", "unavailable"):
                if label == "invalidated":
                    CacheService.invalidate_tags(["analytics"])
                # Reuse the application's actual timeout/retry policy for an
                # unreachable port, so before/after outage measurements are fair.
                options = {**redis_manager.client.connection_pool.connection_kwargs, "port": 56380}
                alternate = None if label == "disabled" else redis.Redis(connection_pool=redis.ConnectionPool(**options))
                statements.clear()
                started = time.perf_counter()
                if label in ("disabled", "unavailable"):
                    with patch.object(redis_manager, "client", alternate):
                        response = client.get(f"/api/analytics/{path}")
                else:
                    response = client.get(f"/api/analytics/{path}")
                elapsed = round((time.perf_counter() - started) * 1000, 2)
                response.raise_for_status()
                original = original or response.json()
                assert response.json() == original
                assert (len(statements) == 0) if label == "hit" else (len(statements) > 0)
                report["checks"][f"{path}_{label}"] = {"ms": elapsed, "sql_count": len(statements), "same_data": True}
        CacheService.invalidate_tags(["analytics"])
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/performance/cache-verification.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
