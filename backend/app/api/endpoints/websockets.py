import logging
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
    await manager.connect(websocket)
    try:
        # Keep connection open.
        # Only support a minimal ping/pong for connection health.
        while True:
            data = await websocket.receive_text()
            if data and data.lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        manager.disconnect(websocket)
