import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()
        
    async def connect(self, websocket: WebSocket):
        """Accepts a WebSocket connection and registers the client."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        """Removes a disconnected client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]):
        """
        Broadcast a JSON message to all connected clients.
        If sending to a specific client fails, it is removed immediately without breaking the loop.
        """
        if not self.active_connections:
            return
            
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json({"event_type":message.get("event_type","analytics_updated")})
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket, marking for removal: {e}")
                disconnected.add(connection)
                
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()
