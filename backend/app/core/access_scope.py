"""Request sessions scope ORM reads before pagination, joins and aggregates."""
from sqlalchemy import event, select, union
from sqlalchemy.orm import with_loader_criteria
from backend.app.core.database import Base
from backend.app.models.canonical import Student
from backend.app.models.intervention import Intervention, InterventionAudit
from backend.app.models.demo_assignment import DemoAssignment


def apply_scope(db,user):
    db.info["identity"] = user
    if user["role"] == "admin":
        return
    student_table = Student.__table__
    intervention_table = Intervention.__table__
    if user["role"] == "faculty":
        allowed = select(student_table.c.student_id).where(student_table.c.department == user["department"])
        interventions = select(intervention_table.c.id).where(intervention_table.c.student_id.in_(allowed))
    else:
        assignment_table = DemoAssignment.__table__
        allowed = union(select(assignment_table.c.student_id).where(assignment_table.c.user_id == user["id"]),
            select(intervention_table.c.student_id).where(intervention_table.c.assignee == user["id"],intervention_table.c.deleted_at.is_(None)))
        interventions = select(intervention_table.c.id).where(intervention_table.c.assignee == user["id"])
    options = []
    for mapper in Base.registry.mappers:
        model = mapper.class_
        if model is InterventionAudit:
            criterion = model.intervention_id.in_(interventions)
        elif model is Intervention and user["role"] in ("mentor","counselor"):
            criterion = model.assignee == user["id"]
        elif hasattr(model,"student_id"):
            criterion = model.student_id.in_(allowed)
        else:
            continue
        options.append(with_loader_criteria(model,criterion,include_aliases=True))

    def scoped_reads(state):
        if state.is_select:
            state.statement = state.statement.options(*options)
    event.listen(db,"do_orm_execute",scoped_reads)
