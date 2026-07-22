"""Application configuration using pydantic-settings.

Loads settings from environment variables and an optional .env file,
providing typed, validated configuration for the SpendiFy AI Service.
"""

from __future__ import annotations

import functools

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Centralised application settings.

    Attributes:
        APP_NAME: Human-readable service name.
        DEBUG: Enable debug-level logging and verbose error responses.
        HOST: Bind address for the Uvicorn server.
        PORT: Bind port for the Uvicorn server.
        DATABASE_URL: Connection string for the backing database.
        MODEL_DIR: Directory where trained ML model artefacts are stored.
        CORS_ORIGINS: Allowed origins for CORS middleware.
    """

    APP_NAME: str = "SpendiFy AI Service"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DATABASE_URL: str = ""
    MODEL_DIR: str = "trained_models"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@functools.lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached :class:`Settings` singleton.

    Using ``lru_cache`` ensures environment variables and the ``.env``
    file are read only once during the process lifetime, avoiding
    redundant I/O on every settings access.

    Returns:
        The shared :class:`Settings` instance.
    """
    return Settings()
