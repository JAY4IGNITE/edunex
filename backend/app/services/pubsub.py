import json
import logging
from typing import Any

import redis

from backend.app.core.redis import redis_manager

logger = logging.getLogger(__name__)

CHANNEL_NAME = "edunex:v1:events"

class PubSubService:
    _subscriber_thread = None
    _pubsub: redis.client.PubSub | None = None

    _loop = None

    @staticmethod
    def publish(event_type: str, payload: dict[str, Any] | None = None) -> bool:
        """Publish a tiny event to the versioned channel."""
        client = redis_manager.get_client()
        if not client:
            return False
            
        try:
            event = {"event_type": event_type}
            if payload:
                event.update(payload)
                
            client.publish(CHANNEL_NAME, json.dumps(event))
            return True
        except (redis.RedisError, TypeError) as e:
            logger.warning(f"Redis publish failed for event {event_type}: {e}")
            return False

    @staticmethod
    def start_subscriber(loop=None):
        """Starts the backend subscriber in a background thread."""
        PubSubService._loop = loop
        client = redis_manager.get_client()
        if not client:
            return
            
        try:
            PubSubService._pubsub = client.pubsub()
            # Register the handler for the target channel
            PubSubService._pubsub.subscribe(**{CHANNEL_NAME: PubSubService._handle_message})
            # run_in_thread manages a dedicated thread to poll get_message() safely
            PubSubService._subscriber_thread = PubSubService._pubsub.run_in_thread(sleep_time=0.1)
            logger.info("Started Redis Pub/Sub subscriber thread.")
        except redis.RedisError as e:
            logger.warning(f"Failed to start Redis subscriber: {e}")

    @staticmethod
    def _handle_message(message: dict):
        """Handle incoming Pub/Sub messages and forward to WebSockets."""
        if message and message.get("type") == "message":
            try:
                data = json.loads(message.get("data"))
                logger.debug(f"Received Pub/Sub event: {data}")
                
                # Event Validation
                event_type = data.get("event_type")
                if event_type not in ("student_updated", "analytics_updated"):
                    logger.warning(f"Received unknown event_type: {event_type}")
                    return
                
                # Dispatch to WebSocket manager if loop is available
                if PubSubService._loop and not PubSubService._loop.is_closed():
                    import asyncio

                    from backend.app.services.websocket import manager
                    asyncio.run_coroutine_threadsafe(manager.broadcast(data), PubSubService._loop)
            except json.JSONDecodeError:
                logger.warning("Received malformed JSON in Pub/Sub event.")

    @staticmethod
    def stop_subscriber():
        """Cleanly shuts down the subscriber."""
        if PubSubService._subscriber_thread:
            try:
                PubSubService._subscriber_thread.stop()
                # Let the reader exit before closing its socket from this thread.
                PubSubService._subscriber_thread.join(timeout=3)
            except Exception as e:
                logger.warning(f"Error stopping Redis subscriber thread: {e}")
            PubSubService._subscriber_thread = None
            
        if PubSubService._pubsub:
            try:
                PubSubService._pubsub.close()
            except Exception as e:
                logger.warning(f"Error closing Redis pubsub: {e}")
            PubSubService._pubsub = None
            
        logger.info("Stopped Redis Pub/Sub subscriber.")
