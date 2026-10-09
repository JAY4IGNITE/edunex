from typing import Literal
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.intervention import InterventionAudit
from backend.app.schemas.intervention import InterventionCreate, InterventionUpdate, Status
from backend.app.services.interventions import InterventionService, DEMO_ASSIGNEES, serialize

router = APIRouter()


@router.get("/priority")
def priority(department: str | None = None, semester: int | None = Query(None, ge=1, le=10),
             year: int | None = Query(None, ge=1, le=5),
             risk_type: Literal["academic", "placement"] | None = None, segment: str | None = None,
             offset: int = Query(0, ge=0), limit: int = Query(25, ge=1, le=100), db: Session = Depends(get_db)):
    return InterventionService(db).queue(department, semester, risk_type, segment, offset, limit, year)


@router.get("/students/{student_id}/recommendations")
def recommendations(student_id: str, db: Session = Depends(get_db)):
    result = InterventionService(db).analysis(student_id)
    result.pop("snapshot")
    result["assignees"] = DEMO_ASSIGNEES
    return result


@router.get("/interventions")
def list_interventions(student_id: str | None = None, status: Status | None = None, assignee: str | None = None,
                       department: str | None = None, semester: int | None = Query(None, ge=1, le=10), year: int | None = Query(None, ge=1, le=5),
                       offset: int = Query(0, ge=0), limit: int = Query(25, ge=1, le=100), db: Session = Depends(get_db)):
    return InterventionService(db).list(student_id, status, assignee, offset, limit, department, semester, year)


@router.post("/interventions", status_code=201)
def create_intervention(payload: InterventionCreate, db: Session = Depends(get_db)):
    return InterventionService(db).create(payload)


@router.get("/interventions/{intervention_id}")
def get_intervention(intervention_id: int, db: Session = Depends(get_db)):
    return serialize(InterventionService(db).record(intervention_id))


@router.patch("/interventions/{intervention_id}")
def update_intervention(intervention_id: int, payload: InterventionUpdate, db: Session = Depends(get_db)):
    return InterventionService(db).update(intervention_id, payload)


@router.delete("/interventions/{intervention_id}", status_code=204)
def delete_intervention(intervention_id: int, version: int = Query(..., ge=1), db: Session = Depends(get_db)):
    InterventionService(db).delete(intervention_id, version)
    return Response(status_code=204)


@router.get("/interventions/{intervention_id}/audit")
def intervention_audit(intervention_id: int, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    InterventionService(db).record(intervention_id)
    query = db.query(InterventionAudit).filter_by(intervention_id=intervention_id)
    return {"items": [dict(id=r.id, actor=r.actor, event=r.event, details=r.details, created_at=r.created_at)
                      for r in query.order_by(InterventionAudit.id).offset(offset).limit(limit)], "total": query.count()}
