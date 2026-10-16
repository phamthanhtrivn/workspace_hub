from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    node_env: Literal["development", "test", "production"] = "development"
    host: str = "0.0.0.0"
    port: int = Field(default=8087, ge=1, le=65535)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    ai_enabled: bool = False
    database_url: SecretStr | None = None
    jwt_secret_key: SecretStr | None = None
    jwt_issuer: str = "workspace-hub"
    internal_service_key: SecretStr | None = None
    document_service_url: str | None = None
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"
    gemini_embedding_model: str = "gemini-embedding-2"
    gemini_requests_per_minute: int = Field(default=5, ge=1)
    gemini_requests_per_day: int = Field(default=100, ge=1)
    gemini_tokens_per_minute: int = Field(default=20000, ge=1000)
    provider_timeout_seconds: int = Field(default=90, ge=1, le=300)
    internal_timeout_seconds: int = Field(default=10, ge=1, le=60)
    parse_timeout_seconds: int = Field(default=120, ge=1, le=300)
    job_lease_seconds: int = Field(default=60, ge=15)
    worker_poll_seconds: float = Field(default=1, ge=0.1, le=30)
    retention_days: int = Field(default=30, ge=1)

    @model_validator(mode="after")
    def validate_feature_configuration(self) -> "Settings":
        if self.ai_enabled:
            required = (
                "database_url",
                "jwt_secret_key",
                "internal_service_key",
                "document_service_url",
                "gemini_api_key",
            )
            missing = [name.upper() for name in required if not getattr(self, name)]
            if missing:
                raise ValueError("Missing AI configuration: " + ", ".join(missing))
            if len(self.jwt_secret_key.get_secret_value()) < 32:
                raise ValueError("JWT_SECRET_KEY must contain at least 32 characters")
        return self

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        origins = value.split(",") if isinstance(value, str) else value
        origins = [origin.strip() for origin in origins if origin.strip()]
        if "*" in origins:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS must list explicit origins for credentialed requests"
            )
        return origins
