"""Validación JWT Supabase: /me y dependencia get_current_claims."""

from __future__ import annotations

import time
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

SUPABASE_URL = "http://127.0.0.1:54321"
JWT_SECRET = "testsecret01234567890123456789012ab"


def _issuer() -> str:
    return f"{SUPABASE_URL.rstrip('/')}/auth/v1"


def _encode_token(payload_overrides: dict[str, Any] | None = None) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": "user-test-uuid",
        "aud": "authenticated",
        "iss": _issuer(),
        "exp": now + 3600,
        "iat": now,
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture(autouse=True)
def _jwt_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", JWT_SECRET)


@pytest.fixture
def client() -> TestClient:
    from main import app

    return TestClient(app)


def test_me_valid_jwt_returns_sub_and_email(client: TestClient) -> None:
    token = _encode_token({"email": "valid@example.com"})
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"sub": "user-test-uuid", "email": "valid@example.com"}


def test_me_valid_jwt_email_from_user_metadata(client: TestClient) -> None:
    token = _encode_token({"user_metadata": {"email": "meta@example.com"}})
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"sub": "user-test-uuid", "email": "meta@example.com"}


def test_me_invalid_jwt_returns_401(client: TestClient) -> None:
    response = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_me_wrong_secret_returns_401(client: TestClient) -> None:
    bad = jwt.encode(
        {
            "sub": "x",
            "aud": "authenticated",
            "iss": _issuer(),
            "exp": int(time.time()) + 3600,
        },
        "wrong-secret-01234567890123456789012",
        algorithm="HS256",
    )
    response = client.get("/me", headers={"Authorization": f"Bearer {bad}"})
    assert response.status_code == 401


def test_me_missing_authorization_returns_401(client: TestClient) -> None:
    response = client.get("/me")
    assert response.status_code == 401
