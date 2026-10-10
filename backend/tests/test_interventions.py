from datetime import date, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.app.core.database import Base
from backend.app.models.canonical import AcademicRecord, AttendanceRecord, Student
from backend.app.models.intervention import InterventionAudit
from backend.app.schemas.intervention import InterventionCreate, InterventionUpdate
from backend.app.services.interventions import InterventionService


@pytest.fixture
def service():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Student(student_id="TEST", department="CSE", year=2, semester=2, section="A", academic_year="2025-2026"))
        db.flush()
        db.add(AcademicRecord(student_id="TEST", semester=2, academic_year="2025-2026", cgpa=4, internal_marks=30, backlogs=4))
        db.add(AttendanceRecord(student_id="TEST", semester=2, academic_year="2025-2026", overall_attendance=61))
        db.commit()
        yield InterventionService(db)
    engine.dispose()


def create(service):
    return service.create(InterventionCreate(student_id="TEST", recommendation_key="learning-support"))


def update(service, record, **fields):
    return service.update(record["id"], InterventionUpdate(version=record["version"], **fields))


def test_assign_start_complete_preserves_audit_and_no_invented_outcome(service):
    record = create(service)
    record = update(service, record, status="Assigned", assignee="faculty-demo", due_date=date.today() + timedelta(days=7))
    record = update(service, record, status="In Progress")
    record = update(service, record, status="Completed", notes="Synthetic mentor session completed.")
    assert record["outcome"]["score_change"] is None
    assert record["outcome"]["follow_up_available"] is False
    assert record["after_snapshot"]["source_hash"] == record["before_snapshot"]["source_hash"]
    assert service.db.query(InterventionAudit).count() == 4


def test_transition_validation_dismissal_and_optimistic_version(service):
    record = create(service)
    for fields in ({"status": "Completed"}, {"status": "Assigned"}, {"status": "Dismissed"}):
        with pytest.raises(HTTPException) as caught:
            update(service, record, **fields)
        assert caught.value.status_code == 422
    dismissed = update(service, record, status="Dismissed", dismissal_reason="Reviewed; existing support is sufficient.")
    with pytest.raises(HTTPException) as caught:
        update(service, record, notes="Stale edit")
    assert caught.value.status_code == 409
    assert dismissed["dismissal_reason"]


def test_duplicate_recommendation_conflict_and_audited_delete(service):
    record = create(service)
    with pytest.raises(HTTPException) as caught:
        create(service)
    assert caught.value.status_code == 409
    service.delete(record["id"], record["version"])
    assert service.list()["total"] == 0
    assert service.db.query(InterventionAudit).count() == 2


def test_priority_filters_pagination_and_read_only_behavior(service):
    assert service.queue(department="Other")["total"] == 0
    assert service.queue(risk_type="placement")["total"] == 0
    page = service.queue(department="CSE", semester=2, risk_type="academic", limit=1)
    assert page["total"] == 1
    assert page["items"][0]["student"]["student_id"] == "TEST"
    assert service.queue(offset=1)["items"] == []
    assert not service.db.new and not service.db.dirty
    assert service.queue(year=4)["total"] == 0
    create(service)
    assert service.list(department="Other")["total"] == 0
    assert service.list(year=4)["total"] == 0
    assert service.list(department="CSE", year=2, semester=2)["total"] == 1


def test_real_later_synthetic_assessment_produces_descriptive_change(service):
    record = create(service)
    record = update(service, record, status="Assigned", assignee="faculty-demo", due_date=date.today())
    record = update(service, record, status="In Progress")
    service.db.add(AcademicRecord(student_id="TEST", semester=3, academic_year="2025-2026", cgpa=7, internal_marks=70, backlogs=0))
    service.db.commit()
    record = update(service, record, status="Completed")
    assert record["outcome"]["follow_up_available"] is True
    expected = record["after_snapshot"]["success_score"] - record["before_snapshot"]["success_score"]
    assert record["outcome"]["score_change"] == pytest.approx(expected, abs=.01)


def test_terminal_records_preserve_reason_and_assignment(service):
    record = create(service)
    dismissed = update(service, record, status="Dismissed", dismissal_reason="Existing support")
    with pytest.raises(HTTPException):
        update(service, dismissed, dismissal_reason=None)
    record = create(service)
    record = update(service, record, status="Assigned", assignee="mentor-demo", due_date=date.today())
    record = update(service, record, status="In Progress")
    with pytest.raises(HTTPException):
        update(service, record, status="Completed", assignee=None, due_date=None)
