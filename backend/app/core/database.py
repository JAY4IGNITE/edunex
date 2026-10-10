from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.core.config import settings

engine = create_engine(
    settings.clean_database_url, 
    connect_args={"prepare_threshold": None, "connect_timeout": 5},
    pool_size=5,
    max_overflow=10,
    pool_timeout=10,
    pool_recycle=1800,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db(request: Request):
    from backend.app.core.access_scope import apply_scope
    from backend.app.core.demo_auth import require_user
    user = require_user(request)
    db = SessionLocal()
    apply_scope(db,user)
    try:
        yield db
    finally:
        db.close()
