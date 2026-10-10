from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func

from backend.app.core.database import Base

__all__ = ["Base", "TimestampMixin"]


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
