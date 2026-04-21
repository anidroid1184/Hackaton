"""Configuracion de entorno (Supabase, JWT, ingesta, proveedores de datos)."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables leidas del entorno; defaults vacios para tests sin env."""

    model_config = SettingsConfigDict(extra="ignore")

    supabase_url: str = ""
    jwt_secret: str = Field(default="", validation_alias="SUPABASE_JWT_SECRET")
    service_role_key: str = Field(
        default="",
        validation_alias="SUPABASE_SERVICE_ROLE_KEY",
    )

    ingest_api_key: str = Field(default="", validation_alias="INGEST_API_KEY")

    data_source: str = Field(default="mock", validation_alias="DATA_SOURCE")
    tinku_base_url: str = Field(
        default="https://techos.thetribu.dev",
        validation_alias="TINKU_BASE_URL",
    )
    tinku_api_key: str = Field(default="", validation_alias="TINKU_API_KEY")
