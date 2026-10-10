"""Rerunnable API/SQL benchmark. Use only a disposable seeded database.

The pre-optimization insights path writes scores, so this runner refuses every
database except the explicitly named local edunex_perf database.
"""
import argparse
import json
import statistics
import time
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import event

from backend.app.core.database import engine
from backend.app.main import app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be positive")
    if engine.url.host not in ("localhost", "127.0.0.1") or engine.url.database != "edunex_perf":
        raise SystemExit("Use the disposable local edunex_perf database.")
    measurements = []
    def before(conn, cursor, statement, parameters, context, executemany):
        context.perf_started = time.perf_counter()
    def after(conn, cursor, statement, parameters, context, executemany):
        measurements.append((time.perf_counter() - context.perf_started, statement.lstrip().split()[0].upper()))
    event.listen(engine, "before_cursor_execute", before)
    event.listen(engine, "after_cursor_execute", after)
    report = {"environment": "local disposable PostgreSQL; Redis disabled; in-process HTTP", "runs": args.runs, "endpoints": {}}
    with TestClient(app) as client:
        client.post("/api/auth/session", json={"user_id": "dean-demo"}, headers={"X-Requested-With": "EduNex"}).raise_for_status()
        for path in ("/api/analytics/overview", "/api/analytics/distribution", "/api/analytics/trends", "/api/insights?department=Computer+Science", "/api/students?skip=0&limit=10"):
            runs = []
            for _ in range(args.runs):
                measurements.clear()
                started = time.perf_counter()
                response = client.get(path)
                elapsed = (time.perf_counter() - started) * 1000
                response.raise_for_status()
                runs.append({"elapsed_ms": round(elapsed, 2), "sql_ms": round(sum(t for t, _ in measurements) * 1000, 2), "sql_count": len(measurements), "sql_writes": sum(op in ("INSERT", "UPDATE", "DELETE") for _, op in measurements), "response_bytes": len(response.content)})
            report["endpoints"][path] = {"samples": runs, "median_ms": round(statistics.median(r["elapsed_ms"] for r in runs), 2)}
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
