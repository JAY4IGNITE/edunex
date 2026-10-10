"""Bounded analytics reads and cache freshness, using isolated real ORM data."""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from backend.app.core.database import Base
from backend.app.core.access_scope import apply_scope
from backend.app.models.canonical import Student, AcademicRecord
from backend.app.models.scoring import StudentSuccessScore
from backend.app.services.insight import InsightService
from backend.app.services.scoring import ScoringService
from backend.app.services.cache import CacheService
from backend.app.api.endpoints.analytics import get_analytics_distribution
from backend.app.api.endpoints.students import list_students
from fastapi import Response
from backend.app.core.demo_auth import current_identity
import redis


@pytest.fixture
def cohort():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        for i in range(24):
            sid = f"PERF{i:02}"
            db.add(Student(student_id=sid, department="CSE" if i < 12 else "IT", year=2,
                           semester=3, section="A", academic_year="2025-2026"))
            db.flush()
            db.add(AcademicRecord(student_id=sid, semester=3, academic_year="2025-2026",
                                  cgpa=6 if i < 12 else 9, internal_marks=70, backlogs=0))
        db.commit()
        scoring = ScoringService(db)
        for sid, in db.query(Student.student_id).all():
            scoring.get_or_calculate_success_score(sid)
        yield db
    engine.dispose()


def test_filtered_insights_bound_queries_and_do_not_commit(cohort):
    queries, commits = [], []
    event.listen(cohort.bind, "before_cursor_execute", lambda *args: queries.append(args[2]))
    event.listen(cohort, "after_commit", lambda *args: commits.append(True))
    result = InsightService(cohort).generate_insights(department="CSE")
    comparison = next(i for i in result.insights if i.insight_id == "SUCCESS_COMP_01")
    assert comparison.metric_value == 60
    assert comparison.comparison_value == 75
    assert len(queries) <= 30
    assert commits == []


def test_student_pagination_has_stable_identity_order(cohort):
    cohort.add(Student(student_id="AAAA", department="CSE", year=2, semester=3,
                       section="A", academic_year="2025-2026"))
    cohort.commit()
    def page(offset):
        return [s.student_id for s in list_students(Response(), department="CSE", year=None,
                                                    semester=None, skip=offset, limit=10, db=cohort)]
    first, second = page(0), page(10)
    assert first[0] == "AAAA"
    assert first + second == sorted(first + second)
    assert len(set(first + second)) == 13


def test_comparison_uses_current_canonical_records_and_preserves_scope(cohort):
    # A saved score is deliberately stale. The comparative calculation must still
    # use current domain evidence, as the original score calculation did.
    cohort.query(AcademicRecord).filter_by(student_id="PERF00").update({"cgpa": 9})
    cohort.commit()
    apply_scope(cohort, {"id": "faculty-demo", "role": "faculty", "department": "CSE"})
    result = InsightService(cohort).generate_insights(department="CSE")
    comparison = next(i for i in result.insights if i.insight_id == "SUCCESS_COMP_01")
    assert comparison.comparison_value == 62.5
    assert cohort.query(StudentSuccessScore).filter_by(student_id="PERF00").one().score == 60


class MemoryRedis:
    """Small stateful test double; no network or production fallback data."""
    def __init__(self):
        self.values, self.tags = {}, {}
    def get(self, key):
        return self.values.get(key)
    def pipeline(self):
        return self
    def setex(self, key, ttl, value):
        self.values[key] = value
    def sadd(self, key, value):
        self.tags.setdefault(key, set()).add(value)
    def expire(self, *args):
        pass
    def execute(self):
        pass
    def smembers(self, key):
        return self.tags.get(key, set())
    def delete(self, *keys):
        for key in keys:
            self.values.pop(key, None)
            self.tags.pop(key, None)


def test_distribution_cache_hit_invalidation_and_fallback(cohort, monkeypatch):
    cache = MemoryRedis()
    monkeypatch.setattr(CacheService, "_get_client", lambda: cache)
    def distribution():
        return get_analytics_distribution(department="CSE", year=None, semester=None, db=cohort)
    first = distribution()
    cohort.query(StudentSuccessScore).filter_by(student_id="PERF00").update({"score": 95})
    cohort.commit()
    assert distribution() == first  # Redis HIT.
    CacheService.invalidate_tags(["analytics"])
    fresh = distribution()  # MISS must reach canonical database state.
    assert fresh.success_score_distribution != first.success_score_distribution
    monkeypatch.setattr(CacheService, "_get_client", lambda: None)
    assert distribution() == fresh


def test_cache_errors_and_scoped_identity_fail_open(monkeypatch):
    cache = MemoryRedis()
    monkeypatch.setattr(CacheService, "_get_client", lambda: cache)
    assert CacheService.set("test", {"count": 10})
    token = current_identity.set({"role": "mentor"})
    try:
        assert CacheService.get("test") is None
        assert not CacheService.set("test", {"count": 1})
    finally:
        current_identity.reset(token)
    assert CacheService.get("test") == {"count": 10}
    cache.values["test"] = "malformed json"
    assert CacheService.get("test") is None
    def unavailable(*args):
        raise redis.ConnectionError("test outage")
    monkeypatch.setattr(cache, "get", unavailable)
    monkeypatch.setattr(cache, "pipeline", unavailable)
    assert CacheService.get("test") is None
    assert not CacheService.set("test", {})
    CacheService.invalidate_tags(["analytics"])
