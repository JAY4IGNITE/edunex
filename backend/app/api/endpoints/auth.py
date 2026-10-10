import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from backend.app.core.demo_auth import DEMO_USERS, SESSION_SECONDS, session_user

router = APIRouter()


class DemoLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: str = Field(min_length=1,max_length=80)


@router.get("/users")
def demo_users():
    return {"users":list(DEMO_USERS.values()),"notice":"Public synthetic demo. Pick any role; this is not a production account system."}


@router.get("/session")
def current_session(request:Request):
    return {"user":session_user(request.session)}


@router.post("/session")
def login(payload:DemoLogin,request:Request):
    user = DEMO_USERS.get(payload.user_id)
    if not user:
        raise HTTPException(422,"Choose a listed demo identity")
    request.session.clear()
    request.session.update(user_id=user["id"],expires_at=time.time()+SESSION_SECONDS)
    return {"user":user}


@router.delete("/session")
def logout(request:Request):
    request.session.clear()
    return {"user":None}
