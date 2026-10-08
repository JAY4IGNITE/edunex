import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.cache import CacheService
import redis

def test_cache_set_and_invalidate_tags():
    # We use a mock to verify behavior without a real Redis server
    mock_redis = MagicMock()
    
    # Setup mock pipeline
    mock_pipeline = MagicMock()
    mock_redis.pipeline.return_value = mock_pipeline
    mock_redis.smembers.return_value = {b"edunex:v1:student:123:score"}
    
    with patch.object(CacheService, "_get_client", return_value=mock_redis):
        # 1. Test SET with tags
        CacheService.set("edunex:v1:student:123:score", {"score": 90}, tags=["analytics", "student:123"])
        
        # Verify pipeline was called correctly
        assert mock_pipeline.setex.called
        assert mock_pipeline.sadd.called
        assert mock_pipeline.expire.called
        assert mock_pipeline.execute.called
        
        # 2. Test invalidate_tags
        CacheService.invalidate_tags(["analytics"])
        
        # Verify smembers was called to fetch keys
        mock_redis.smembers.assert_called_with("edunex:v1:index:analytics")
        
        # Verify delete was called in pipeline
        assert mock_pipeline.delete.called
        
def test_redis_unavailable_fallback():
    # If redis is None, it should gracefully bypass
    with patch.object(CacheService, "_get_client", return_value=None):
        assert CacheService.get("some_key") is None
        assert CacheService.set("some_key", "value") is False
        # Invalidate should just return without error
        CacheService.invalidate_tags(["analytics"])
        
def test_redis_exception_during_invalidation():
    mock_redis = MagicMock()
    mock_redis.pipeline.side_effect = redis.RedisError("Connection lost")
    
    with patch.object(CacheService, "_get_client", return_value=mock_redis):
        # Should not raise an exception, just catch and log
        CacheService.invalidate_tags(["analytics"])
