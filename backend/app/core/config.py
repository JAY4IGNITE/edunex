from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "CampusPulse AI"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://campuspulse:campuspulse@localhost:5432/campuspulse"
    frontend_origin: str = "http://localhost:3000,http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
