"""Unit: verify_ingest_key rechaza requests sin/con key invalida y usa constant-time."""

from __future__ import annotations

import inspect

import pytest
from fastapi import HTTPException
from security.ingest_key import verify_ingest_key
from settings import Settings


@pytest.mark.unit
def test_missing_header_raises_401() -> None:
    settings = Settings(INGEST_API_KEY="secret")
    with pytest.raises(HTTPException) as exc:
        verify_ingest_key(x_ingest_key=None, settings=settings)
    assert exc.value.status_code == 401


@pytest.mark.unit
def test_wrong_key_raises_401() -> None:
    settings = Settings(INGEST_API_KEY="secret")
    with pytest.raises(HTTPException) as exc:
        verify_ingest_key(x_ingest_key="other", settings=settings)
    assert exc.value.status_code == 401


@pytest.mark.unit
def test_correct_key_passes_without_raising() -> None:
    settings = Settings(INGEST_API_KEY="secret")
    verify_ingest_key(x_ingest_key="secret", settings=settings)


@pytest.mark.unit
def test_empty_key_on_settings_still_rejects() -> None:
    """Evita que una key vacia en env permita cualquier request."""
    settings = Settings(INGEST_API_KEY="")
    with pytest.raises(HTTPException) as exc:
        verify_ingest_key(x_ingest_key="", settings=settings)
    assert exc.value.status_code == 401


@pytest.mark.unit
def test_source_uses_hmac_compare_digest() -> None:
    """Regresion: comparacion debe ser constant-time para evitar timing attacks."""
    src = inspect.getsource(verify_ingest_key)
    assert "compare_digest" in src
