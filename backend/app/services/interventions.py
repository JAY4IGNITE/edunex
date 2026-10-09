from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError

from backend.app.models.canonical import Student
from backend.app.models.intervention import Intervention, InterventionAudit
from backend.app.services.student_360 import Student360Service
from backend.app.services.support_analysis import analyze_student, priority_score, observed_outcome, ACTIVE_STATUSES, PRIORITY_FORMULA, PROVENANCE
from backend.app.services.cache import CacheService

DEMO_ASSIGNEES = {"faculty-demo": "Faculty", "mentor-demo": "Mentor", "counselor-demo": "Counselor", "placement-demo": "Placement Officer"}
TRANSITIONS = {"Recommended": {"Assigned", "Dismissed"}, "Assigned": {"In Progress", "Dismissed"},
               "In Progress": {"Completed", "Dismissed"}, "Completed": set(), "Dismissed": set()}


def serialize(record):
    return {field: getattr(record, field) for field in ("id", "student_id", "recommendation_key", "recommendation", "status", "assignee", "due_date", "notes", "dismissal_reason", "before_snapshot", "after_snapshot", "outcome", "version", "created_at", "updated_at", "completed_at")}


class InterventionService:
    def __init__(self, db):
        self.db = db
        self.students = Student360Service(db)

    def analysis(self, student_id):
        return analyze_student(self.students.get_student_360(student_id))

    def queue(self, department=None, semester=None, risk_type=None, segment=None, offset=0, limit=25, year=None):
        query = self.db.query(Student.student_id)
        if department:
            query = query.filter(Student.department == department)
        if semester:
            query = query.filter(Student.semester == semester)
        if year:
            query = query.filter(Student.year == year)
        ids = [row.student_id for row in query.order_by(Student.student_id).all()]
        active = self.db.query(Intervention.student_id, Intervention.recommendation).filter(
            Intervention.status.in_(ACTIVE_STATUSES), Intervention.deleted_at.is_(None)).all()
        addressed = {}
        for student_id, recommendation in active:
            addressed.setdefault(student_id, set()).update(recommendation["driver_keys"])
        result = []
        for start in range(0, len(ids), 200):
            for profile in self.students.get_students_360_bulk(ids[start:start + 200]):
                analysis = analyze_student(profile)
                if not any((analysis[k] or {}).get("risk_level") in ("MEDIUM", "HIGH") for k in ("academic_risk", "placement_risk")):
                    continue
                if risk_type and (analysis[f"{risk_type}_risk"] or {}).get("risk_level") not in ("MEDIUM", "HIGH"):
                    continue
                if segment and segment not in analysis["segments"]:
                    continue
                analysis.pop("snapshot")
                analysis["priority_breakdown"] = priority_score(analysis, addressed.get(profile.student.student_id, set()))
                result.append(analysis)
        result.sort(key=lambda row: (-row["priority_breakdown"]["priority"], row["student"]["student_id"]))
        return dict(items=result[offset:offset + limit], total=len(result), offset=offset, limit=limit,
                    formula=PRIORITY_FORMULA, provenance=PROVENANCE)

    def record(self, intervention_id):
        record = self.db.query(Intervention).filter_by(id=intervention_id, deleted_at=None).first()
        if not record:
            raise HTTPException(404, "Intervention not found")
        return record

    def _audit(self, record, actor, event, details):
        self.db.add(InterventionAudit(intervention_id=record.id, actor=actor, event=event, details=details))

    def _commit(self):
        try:
            self.db.commit()
        except (IntegrityError, StaleDataError):
            self.db.rollback()
            raise HTTPException(409, "This recommendation already exists or changed. Refresh and try again.")
        CacheService.invalidate_tags(["interventions", "analytics"])

    def create(self, payload, actor="demo-admin"):
        analysis = self.analysis(payload.student_id)
        recommendation = next((r for r in analysis["recommendations"] if r["key"] == payload.recommendation_key), None)
        if not recommendation:
            raise HTTPException(422, "Recommendation is no longer applicable; refresh the student profile.")
        record = Intervention(student_id=payload.student_id, recommendation_key=payload.recommendation_key,
                              recommendation=recommendation, before_snapshot=analysis["snapshot"],
                              active_key=f"{payload.student_id}:{payload.recommendation_key}")
        self.db.add(record)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(409, "An open intervention already exists for this recommendation.")
        self._audit(record, actor, "Recommended", {"recommendation": recommendation})
        self._commit()
        return serialize(record)

    def update(self, intervention_id, payload, actor="demo-admin"):
        record = self.record(intervention_id)
        if record.version != payload.version:
            raise HTTPException(409, "This intervention changed. Refresh and try again.")
        target = payload.status or record.status
        if target != record.status and target not in TRANSITIONS[record.status]:
            raise HTTPException(422, f"Cannot change {record.status} to {target}.")
        changes = payload.model_dump(exclude_unset=True, mode="json")
        assignee = payload.assignee if "assignee" in payload.model_fields_set else record.assignee
        due = payload.due_date if "due_date" in payload.model_fields_set else record.due_date
        if assignee is not None and assignee not in DEMO_ASSIGNEES:
            raise HTTPException(422, "Choose a synthetic demo assignee.")
        if target in (*ACTIVE_STATUSES, "Completed") and (not assignee or not due):
            raise HTTPException(422, "Assigned and in-progress interventions require an assignee and due date.")
        if target == "Assigned" and record.status == "Recommended" and due < date.today():
            raise HTTPException(422, "A new assignment cannot be due in the past.")
        reason = payload.dismissal_reason if "dismissal_reason" in payload.model_fields_set else record.dismissal_reason
        if target == "Dismissed" and not reason:
            raise HTTPException(422, "Dismissal requires a reason.")
        if record.status in ("Completed", "Dismissed") and any(k in payload.model_fields_set for k in ("assignee", "due_date")):
            raise HTTPException(422, "Completed and dismissed assignments are immutable; notes can be appended.")
        old_status = record.status
        if target == "Assigned" and old_status == "Recommended":
            record.before_snapshot = self.analysis(record.student_id)["snapshot"]
        if target == "Completed" and old_status != "Completed":
            record.after_snapshot = self.analysis(record.student_id)["snapshot"]
            record.outcome = observed_outcome(record.before_snapshot, record.after_snapshot)
            record.completed_at = datetime.now(timezone.utc)
        for field in ("assignee", "due_date", "notes", "dismissal_reason"):
            if field in payload.model_fields_set:
                if field == "notes" and payload.notes is None:
                    raise HTTPException(422, "Notes cannot be null; use an empty string to clear them.")
                setattr(record, field, getattr(payload, field))
        record.status = target
        if target in ("Completed", "Dismissed"):
            record.active_key = None
        self._audit(record, actor, target if old_status != target else "Updated", {"from_status": old_status, "changes": changes})
        # Force a version increment even for a no-op edit, preserving audit ordering.
        record.updated_at = datetime.now(timezone.utc)
        self._commit()
        return serialize(record)

    def delete(self, intervention_id, version, actor="demo-admin"):
        record = self.record(intervention_id)
        if record.version != version:
            raise HTTPException(409, "This intervention changed. Refresh and try again.")
        if record.status != "Recommended":
            raise HTTPException(422, "Only unassigned recommendations can be deleted; dismiss active work with a reason.")
        record.deleted_at = datetime.now(timezone.utc)
        record.active_key = None
        self._audit(record, actor, "Deleted", {"reason": "Removed unassigned recommendation"})
        self._commit()

    def list(self, student_id=None, status=None, assignee=None, offset=0, limit=25, department=None, semester=None, year=None):
        query = self.db.query(Intervention).join(Student).filter(Intervention.deleted_at.is_(None))
        for name, value in (("department", department), ("semester", semester), ("year", year)):
            if value is not None:
                query = query.filter(getattr(Student, name) == value)
        for name, value in (("student_id", student_id), ("status", status), ("assignee", assignee)):
            if value:
                query = query.filter(getattr(Intervention, name) == value)
        return dict(items=[serialize(r) for r in query.order_by(Intervention.updated_at.desc(), Intervention.id.desc()).offset(offset).limit(limit)],
                    total=query.count(), offset=offset, limit=limit, provenance=PROVENANCE)
