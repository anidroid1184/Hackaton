"""Decodificación de JWT emitidos por Supabase Auth (HS256)."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from settings import Settings


def get_settings() -> Settings:
    return Settings()


def decode_supabase_jwt(token: str, settings: Settings) -> dict:
    """Valida y decodifica un JWT HS256 con audiencia e issuer de Supabase."""
    base = settings.supabase_url.rstrip("/")
    issuer = f"{base}/auth/v1"
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        issuer=issuer,
    )


def _resolve_email(claims: dict) -> str | None:
    direct = claims.get("email")
    if isinstance(direct, str) and direct:
        return direct
    meta = claims.get("user_metadata")
    if isinstance(meta, dict):
        em = meta.get("email")
        if isinstance(em, str) and em:
            return em
    return None


def get_current_claims(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    if settings.data_source == "mock":
        # Modo desarrollo: permite consumir endpoints sin Supabase/JWT.
        return {
            "sub": "mock-user",
            "email": "mock@local",
            "user_metadata": {"email": "mock@local"},
        }

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    raw = authorization.removeprefix("Bearer ").strip()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    try:
        return decode_supabase_jwt(raw, settings)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None


def me_payload(claims: dict) -> dict[str, str | None]:
    return {"sub": claims["sub"], "email": _resolve_email(claims)}
