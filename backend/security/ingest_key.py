"""Verificacion de la clave de ingesta (maquina-a-maquina).

Regla arquitectonica (docs/ARCHITECTURE.md): /ingest NO usa JWT de usuario,
usa un secreto compartido `X-Ingest-Key` entre Tinku/worker y FastAPI.
"""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jwt_auth import get_settings
from settings import Settings


def verify_ingest_key(
    x_ingest_key: Annotated[str | None, Header(alias="X-Ingest-Key")] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> None:
    """Rechaza requests sin header o con key invalida; compara en tiempo constante."""
    configured = (settings.ingest_api_key or "") if settings is not None else ""
    provided = x_ingest_key or ""
    if not configured or not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid ingest key",
        )
    if not hmac.compare_digest(provided.encode(), configured.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid ingest key",
        )
