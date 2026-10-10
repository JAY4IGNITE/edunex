import logging
import asyncio
import time
from backend.app.core.demo_auth import session_user, origin_allowed
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.websocket import manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/updates")
async def websocket_updates(websocket: WebSocket):
    """
    Realtime WebSocket connection endpoint.
    Clients receive tiny notifications when backend data is updated.
    Does NOT accept client commands or queries.
    """
    if not session_user(websocket.session) or not origin_allowed(websocket):
        await websocket.close(code=1008)
        return
    await manager.connect(websocket)
    try:
        # Keep connection open.
        # Only support a minimal ping/pong for connection health.
        while True:
            if websocket.session.get("expires_at",0) <= time.time():
                await websocket.close(code=1008)
                break
            try:
                data = await asyncio.wait_for(websocket.receive_text(),timeout=30)
            except asyncio.TimeoutError:
                continue
            if data and data.lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        manager.disconnect(websocket)
    finally:
        manager.disconnect(websocket)
