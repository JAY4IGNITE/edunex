import json
import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.pubsub import PubSubService
import redis

def test_pubsub_publish_success():
    mock_redis = MagicMock()
    
    with patch("backend.app.services.pubsub.redis_manager.get_client", return_value=mock_redis):
        result = PubSubService.publish("student_updated", {"student_id": "STU123"})
        
        assert result is True
        mock_redis.publish.assert_called_once()
        args, kwargs = mock_redis.publish.call_args
        assert args[0] == "edunex:v1:events"
        payload = json.loads(args[1])
        assert payload["event_type"] == "student_updated"
        assert payload["student_id"] == "STU123"

def test_pubsub_redis_unavailable():
    with patch("backend.app.services.pubsub.redis_manager.get_client", return_value=None):
        # Should return False but not raise exception
        result = PubSubService.publish("analytics_updated")
        assert result is False

def test_pubsub_redis_exception():
    mock_redis = MagicMock()
    mock_redis.publish.side_effect = redis.RedisError("Connection lost")
    
    with patch("backend.app.services.pubsub.redis_manager.get_client", return_value=mock_redis):
        # Should gracefully catch the exception
        result = PubSubService.publish("analytics_updated")
        assert result is False

def test_subscriber_lifecycle():
    mock_redis = MagicMock()
    mock_pubsub = MagicMock()
    mock_redis.pubsub.return_value = mock_pubsub
    mock_thread = MagicMock()
    mock_pubsub.run_in_thread.return_value = mock_thread
    
    with patch("backend.app.services.pubsub.redis_manager.get_client", return_value=mock_redis):
        # Start
        PubSubService.start_subscriber()
        assert PubSubService._pubsub is not None
        assert PubSubService._subscriber_thread is not None
        mock_pubsub.subscribe.assert_called_once()
        mock_pubsub.run_in_thread.assert_called_once_with(sleep_time=0.1)
        
        # Stop
        PubSubService.stop_subscriber()
        assert PubSubService._pubsub is None
        assert PubSubService._subscriber_thread is None
        mock_thread.stop.assert_called_once()
        mock_thread.join.assert_called_once_with(timeout=3)
        mock_pubsub.close.assert_called_once()
