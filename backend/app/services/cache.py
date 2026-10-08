import json
import logging
from typing import Any, Optional
import redis
from backend.app.core.redis import redis_manager

logger = logging.getLogger(__name__)

class CacheService:
    @staticmethod
    def _get_client() -> Optional[redis.Redis]:
        return redis_manager.get_client()

    @staticmethod
    def get(key: str) -> Optional[Any]:
        client = CacheService._get_client()
        if not client:
            return None
            
        try:
            data = client.get(key)
            if data:
                try:
                    return json.loads(data)
                except json.JSONDecodeError:
                    logger.warning(f"Malformed cache data for key: {key}")
                    return None
            return None
        except redis.RedisError as e:
            logger.warning(f"Redis GET failed for key {key}: {e}")
            return None

    @staticmethod
    def set(key: str, value: Any, ttl: int = 300, tags: Optional[list[str]] = None) -> bool:
        client = CacheService._get_client()
        if not client:
            return False
            
        try:
            if hasattr(value, "model_dump"):
                serialized = json.dumps(value.model_dump(mode="json"))
            elif hasattr(value, "dict"):
                serialized = json.dumps(value.dict())
            else:
                serialized = json.dumps(value)
                
            pipeline = client.pipeline()
            pipeline.setex(key, ttl, serialized)
            
            if tags:
                for tag in tags:
                    index_key = f"edunex:v1:index:{tag}"
                    pipeline.sadd(index_key, key)
                    pipeline.expire(index_key, ttl + 60) # Keep index slightly longer than keys
                    
            pipeline.execute()
            return True
        except (redis.RedisError, TypeError) as e:
            logger.warning(f"Redis SET failed for key {key}: {e}")
            return False

    @staticmethod
    def invalidate_tags(tags: list[str]):
        """Deterministically invalidates all keys associated with specific tags."""
        client = CacheService._get_client()
        if not client or not tags:
            return
            
        try:
            pipeline = client.pipeline()
            keys_to_delete = set()
            
            # Gather all tracked keys
            for tag in tags:
                index_key = f"edunex:v1:index:{tag}"
                members = client.smembers(index_key)
                if members:
                    keys_to_delete.update(members)
                keys_to_delete.add(index_key)
                
            if keys_to_delete:
                pipeline.delete(*keys_to_delete)
                pipeline.execute()
        except redis.RedisError as e:
            logger.warning(f"Redis tag invalidation failed: {e}")
