import asyncio
import json

import pytest

from backend.app.main import app
from backend.app.services.pubsub import PubSubService
from backend.app.services.websocket import manager
from backend.tests.test_client import AuthenticatedTestClient as TestClient


def test_websocket_connection_and_ping():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/updates") as websocket:
            # Test ping/pong
            websocket.send_text("ping")
            data = websocket.receive_text()
            assert data == "pong"
            
            # Test client registration
            assert len(manager.active_connections) == 1
            
        # Test client disconnect
        assert len(manager.active_connections) == 0

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_websocket_broadcast():
    # We will mock websockets and add them to the manager
    class MockWebSocket:
        def __init__(self):
            self.messages = []
            
        async def send_json(self, data):
            self.messages.append(data)
            
    ws1 = MockWebSocket()
    ws2 = MockWebSocket()
    
    manager.active_connections.add(ws1)
    manager.active_connections.add(ws2)
    
    await manager.broadcast({"event_type": "student_updated", "student_id": "123"})
    
    assert len(ws1.messages) == 1
    assert ws1.messages[0]["event_type"] == "student_updated"
    assert len(ws2.messages) == 1
    
    manager.active_connections.clear()

@pytest.mark.anyio
async def test_websocket_broadcast_failure_removes_client():
    class FailingMockWebSocket:
        async def send_json(self, data):
            raise Exception("Network Error")
            
    ws = FailingMockWebSocket()
    manager.active_connections.add(ws)
    
    # Broadcast should catch the exception and remove the client
    await manager.broadcast({"event_type": "student_updated"})
    
    assert len(manager.active_connections) == 0

def test_pubsub_handle_message_valid():
    # Test valid message dispatch to broadcast
    class DummyLoop:
        def is_closed(self): return False
        
    loop = DummyLoop()
    PubSubService._loop = loop
    
    message = {
        "type": "message",
        "data": json.dumps({"event_type": "analytics_updated"})
    }
    
    # We mock asyncio.run_coroutine_threadsafe to ensure it gets called
    original = asyncio.run_coroutine_threadsafe
    called = False
    
    def mock_run_coroutine_threadsafe(coro, loop):
        nonlocal called
        called = True
        coro.close()
        
    asyncio.run_coroutine_threadsafe = mock_run_coroutine_threadsafe
    try:
        PubSubService._handle_message(message)
        assert called is True
    finally:
        asyncio.run_coroutine_threadsafe = original

def test_pubsub_handle_message_invalid():
    # Test invalid message is ignored
    class DummyLoop:
        def is_closed(self): return False
        
    loop = DummyLoop()
    PubSubService._loop = loop
    
    message = {
        "type": "message",
        "data": json.dumps({"event_type": "unknown_event_type"})
    }
    
    original = asyncio.run_coroutine_threadsafe
    called = False
    
    def mock_run_coroutine_threadsafe(coro, loop):
        nonlocal called
        called = True
        
    asyncio.run_coroutine_threadsafe = mock_run_coroutine_threadsafe
    try:
        PubSubService._handle_message(message)
        assert called is False
    finally:
        asyncio.run_coroutine_threadsafe = original
