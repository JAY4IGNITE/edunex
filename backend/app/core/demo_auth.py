"""Public synthetic demo identities; this is not production account enrollment."""
import secrets
import time
from contextvars import ContextVar
from urllib.parse import urlparse

from fastapi import HTTPException
from starlette.responses import JSONResponse

from backend.app.core.config import settings

DEMO_USERS = {
    "dean-demo": {"id":"dean-demo","name":"Demo Dean / Admin","role":"admin","department":None,"scope":"All synthetic students and institutional KPIs"},
    "faculty-demo": {"id":"faculty-demo","name":"Demo HOD / Faculty","role":"faculty","department":"Computer Science","scope":"Computer Science students and department interventions"},
    "mentor-demo": {"id":"mentor-demo","name":"Demo Mentor","role":"mentor","department":None,"scope":"Assigned synthetic students and own tasks"},
    "counselor-demo": {"id":"counselor-demo","name":"Demo Counselor","role":"counselor","department":None,"scope":"Assigned synthetic students and own tasks"},
    "placement-demo": {"id":"placement-demo","name":"Demo Placement Faculty","role":"faculty","department":"Information Technology","scope":"Information Technology students and interventions"},
}
current_identity = ContextVar("demo_identity",default=None)
SESSION_SECONDS = 3600
COOKIE_SECURE = settings.environment != "development"
import warnings
SESSION_SECRET = settings.edunex_session_secret or secrets.token_urlsafe(48)
if COOKIE_SECURE and not settings.edunex_session_secret:
    warnings.warn("EDUNEX_SESSION_SECRET not set; using random ephemeral secret. Sessions will reset on restart.")
elif COOKIE_SECURE and len(SESSION_SECRET) < 32:
    raise RuntimeError("Set EDUNEX_SESSION_SECRET to a shared random value of at least 32 characters")
PUBLIC_PATHS = {"/api/health","/api/keep-alive","/api/model","/api/auth/users","/api/auth/session"}


def session_user(session):
    return DEMO_USERS.get("dean-demo")


def origin_allowed(request):
    origin = request.headers.get("origin")
    if not origin:
        return True  # Non-browser clients still require the JSON/custom-header contract.
    allowed = {v.strip().rstrip("/") for v in settings.frontend_origin.split(",")}
    allowed.add(str(request.base_url).rstrip("/"))
    if origin.rstrip("/") in allowed:
        return True
    parsed = urlparse(origin)
    return not COOKIE_SECURE and parsed.scheme == "http" and parsed.hostname in ("localhost","127.0.0.1")


async def authenticate_request(request, call_next):
    user = session_user(request.session)
    request.state.user = user
    path = request.url.path.rstrip("/")
    if request.method != "OPTIONS" and path.startswith("/api/"):
        if request.method in ("POST","PUT","PATCH","DELETE") and (
            not origin_allowed(request) or request.headers.get("x-requested-with") != "EduNex"):
            return JSONResponse({"detail":"Invalid request origin or missing request header"},status_code=403)
        if path not in PUBLIC_PATHS and not user:
            return JSONResponse({"detail":"Choose a demo role to continue"},status_code=401)
        if path == "/api/data/quality" and user and user["role"] != "admin":
            return JSONResponse({"detail":"Institution-wide data quality is available to the demo Admin"},status_code=403)
    token = current_identity.set(user)
    try:
        response = await call_next(request)
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "private, no-store"
            response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    finally:
        current_identity.reset(token)


def require_user(request):
    user = getattr(request.state,"user",None)
    if not user:
        raise HTTPException(401,"Choose a demo role to continue")
    return user
