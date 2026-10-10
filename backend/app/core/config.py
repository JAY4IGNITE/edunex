from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CampusPulse AI"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://campuspulse:campuspulse@localhost:5432/campuspulse"
    redis_url: str | None = None
    edunex_session_secret: str | None = None
    edunex_model_path: str | None = None
    
    @property
    def clean_database_url(self) -> str:
        url = self.database_url.replace("?pgbouncer=true", "")
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    frontend_origin: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env",extra="ignore")


settings = Settings()
