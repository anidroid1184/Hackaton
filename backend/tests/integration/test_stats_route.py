"""Integration: GET /stats/{client_id} con repo fake y JWT Supabase."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import jwt
import pytest
from fastapi.testclient import TestClient
from jwt_auth import get_settings
from main import app
from routers.stats import get_stats_repo
from settings import Settings

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


class FakeStatsRepo:
    def __init__(self) -> None:
        self.calls: list[tuple[UUID, datetime, datetime]] = []

    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[dict[str, Any]]:
        self.calls.append((client_id, window_from, window_to))
        return [
            {
                "ts": datetime(2026, 4, 18, 12, 0, tzinfo=UTC),
                "canonical": {"p_active_kw": 2.0, "pf": 0.95},
            },
            {
                "ts": datetime(2026, 4, 18, 13, 0, tzinfo=UTC),
                "canonical": {"p_active_kw": 3.0, "pf": 0.9},
            },
            {
                "ts": datetime(2026, 4, 18, 14, 0, tzinfo=UTC),
                "canonical": {"p_active_kw": 4.0, "pf": 0.85},
            },
        ]


@pytest.fixture
def fake_repo() -> FakeStatsRepo:
    return FakeStatsRepo()


@pytest.fixture
def client(fake_repo: FakeStatsRepo) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: Settings(
        SUPABASE_URL=SUPABASE_URL,
        SUPABASE_JWT_SECRET=JWT_SECRET,
    )
    app.dependency_overrides[get_stats_repo] = lambda: fake_repo
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.mark.integration
def test_stats_route_returns_windowed_payload(client: TestClient, fake_repo: FakeStatsRepo) -> None:
    token = _encode_token()
    client_id = "11111111-1111-1111-1111-111111111111"
    response = client.get(
        f"/stats/{client_id}",
        params={
            "from": "2026-04-18T12:00:00Z",
            "to": "2026-04-18T14:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["client_id"] == client_id
    assert body["technical"]["energy_kwh"] == pytest.approx(5.0)
    assert body["financial"]["savings_accumulated_usd"] == pytest.approx(1.0)
    assert body["window"]["from"] == "2026-04-18T12:00:00Z"
    assert body["window"]["to"] == "2026-04-18T14:00:00Z"
    assert fake_repo.calls


@pytest.mark.integration
def test_stats_route_rejects_invalid_window(client: TestClient) -> None:
    token = _encode_token()
    client_id = "11111111-1111-1111-1111-111111111111"
    response = client.get(
        f"/stats/{client_id}",
        params={
            "from": "2026-04-18T14:00:00Z",
            "to": "2026-04-18T12:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


@pytest.mark.integration
def test_stats_route_requires_jwt(client: TestClient) -> None:
    response = client.get("/stats/11111111-1111-1111-1111-111111111111")
    assert response.status_code == 401
