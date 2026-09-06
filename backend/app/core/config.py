import os
import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_jwt_secret() -> str:
    env_secret = os.environ.get("JWT_SECRET")
    if env_secret:
        return env_secret
    return secrets.token_urlsafe(48)


def _default_allowed_origins() -> str:
    env_origins = os.environ.get("ALLOWED_ORIGINS")
    if env_origins:
        return env_origins
    return (
        "http://localhost:8000,http://localhost:5500,http://localhost:5000,"
        "http://127.0.0.1:8000,http://127.0.0.1:5500,http://127.0.0.1:5000"
    )


class Settings(BaseSettings):
    app_name: str = "mindsync"
    environment: str = "development"

    database_url: str = ""

    gemini_api_key: str = ""

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7

    cors_origins: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        if not self.jwt_secret:
            setattr(self, "jwt_secret", _default_jwt_secret())
        if not self.cors_origins:
            setattr(self, "cors_origins", _default_allowed_origins())

    @property
    def allowed_origins(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


settings = Settings()