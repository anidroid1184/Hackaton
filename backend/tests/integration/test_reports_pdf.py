"""Integration tests para endpoint de reportes PDF/TEX."""

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


@pytest.mark.integration
def test_reports_generate_requires_jwt(client: TestClient) -> None:
    response = client.get("/reports/generate")
    assert response.status_code == 401


@pytest.mark.integration
def test_reports_generate_pdf_download(client: TestClient) -> None:
    token = _encode_token()
    response = client.get(
        "/reports/generate",
        params={
            "audience": "corporativo",
            "detail": "tecnico",
            "period": "trimestral",
            "company_name": "Marca Demo",
            "client_name": "Cliente Demo",
            "include_promise_vs_real": "true",
            "include_validation_stamp": "false",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")


@pytest.mark.integration
def test_reports_generate_tex_download(client: TestClient) -> None:
    token = _encode_token()
    response = client.get(
        "/reports/generate",
        params={"output": "tex", "audience": "natural", "detail": "simplificado"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-tex")
    body = response.text
    assert "Plantilla sin logo" in body
    assert "Cliente natural" in body
