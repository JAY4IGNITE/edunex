from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.endpoints import students, scoring, academic_risk, placement_risk, explanation, segments, insights, data, analytics, websockets
from backend.app.core.config import settings
from backend.app.core.redis import redis_manager

from backend.app.services.pubsub import PubSubService
from backend.app.api.endpoints import interventions
import asyncio

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

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "campuspulse-ai"}
