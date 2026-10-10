import redis
from redis.backoff import NoBackoff
from redis.retry import Retry
import logging
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class RedisManager:
    def __init__(self):
        self.pool = None
        self.client = None

    def connect(self):
        if settings.redis_url:
            try:
                self.pool = redis.ConnectionPool.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    # Redis is optional: bound each attempt and fall back to SQL.
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                    retry=Retry(NoBackoff(), 0),
                    max_connections=50
                )
                self.client = redis.Redis(connection_pool=self.pool)
                # Test connection
                self.client.ping()
                logger.info("Successfully connected to Redis.")
            except redis.RedisError as e:
                logger.warning(f"Failed to connect to Redis. Running in Postgres-only mode. Error: {e}")
                self.client = None
        else:
            logger.info("REDIS_URL not configured. Running in Postgres-only mode.")
            self.client = None

    def get_client(self) -> redis.Redis | None:
        return self.client

    def disconnect(self):
        if self.pool:
            self.pool.disconnect()
            logger.info("Redis connection pool closed.")

redis_manager = RedisManager()
