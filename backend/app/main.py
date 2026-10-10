import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import JSONResponse

from backend.app.api.endpoints import (
    academic_risk,
    analytics,
    auth,
    data,
    explanation,
    insights,
    interventions,
    model,
    placement_risk,
    scoring,
    segments,
    students,
    websockets,
)
from backend.app.core.config import settings
from backend.app.core.database import engine
from backend.app.core.demo_auth import (
    COOKIE_SECURE,
    SESSION_SECONDS,
    SESSION_SECRET,
    authenticate_request,
)
from backend.app.core.redis import redis_manager
from backend.app.services.pubsub import PubSubService


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_manager.connect()
    loop = asyncio.get_running_loop()
    PubSubService.start_subscriber(loop=loop)
    yield
    PubSubService.stop_subscriber()
    redis_manager.disconnect()

app = FastAPI(
    title="CampusPulse AI API",
    version="0.1.0",
    lifespan=lifespan,
)

app.middleware("http")(authenticate_request)
app.add_middleware(SessionMiddleware,secret_key=SESSION_SECRET,session_cookie="edunex_demo",
                   max_age=SESSION_SECONDS,https_only=COOKIE_SECURE,same_site="none" if COOKIE_SECURE else "lax")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origin.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websockets.router, prefix="/ws", tags=["websockets"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(scoring.router, prefix="/api/students", tags=["scoring"])
app.include_router(academic_risk.router, prefix="/api/students", tags=["academic_risk"])
app.include_router(placement_risk.router, prefix="/api/students", tags=["placement_risk"])
app.include_router(explanation.router, prefix="/api/students", tags=["explanation"])
app.include_router(segments.router, prefix="/api/segments", tags=["segments"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(interventions.router, prefix="/api", tags=["interventions"])
app.include_router(model.router, prefix="/api", tags=["model"])
app.include_router(auth.router, prefix="/api/auth", tags=["demo_auth"])

@app.get("/")
@app.head("/")
def root():
    """Root endpoint for basic health checks and preventing 404 on the base URL."""
    return {"status": "ok", "message": "CampusPulse AI API is running"}

@app.get("/api/health")
@app.head("/api/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "service": "campuspulse-ai", "database": "ready"}
    except SQLAlchemyError:
        return JSONResponse({"status": "not_ready", "service": "campuspulse-ai", "database": "unavailable"}, status_code=503)

@app.get("/api/keep-alive")
@app.head("/api/keep-alive")
def keep_alive():
    """Endpoint to keep the backend server active and prevent it from going to sleep."""
    return {"status": "active", "message": "Server is awake!"}
