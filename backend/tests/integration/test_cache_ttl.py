"""Integration tests de cache TTL en rutas costosas + invalidacion en ingest."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import jwt
import pytest
from cache.store import response_cache
from fastapi.testclient import TestClient
from jwt_auth import get_settings
from main import app
from routers.ingest import get_readings_repo
from routers.stats import get_stats_repo
from settings import Settings

SUPABASE_URL = "http://127.0.0.1:54321"
JWT_SECRET = "testsecret01234567890123456789012ab"
INGEST_KEY = "cache-invalidation-key"


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


class CountingStatsRepo:
    def __init__(self) -> None:
        self.calls = 0

    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[dict[str, Any]]:
        del client_id
        del window_from
        del window_to
        self.calls += 1
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


class FakeReadingsRepo:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []

    async def insert_readings(self, rows: list[dict[str, Any]]) -> None:
        self.rows.extend(rows)


@pytest.fixture
def stats_repo() -> CountingStatsRepo:
    return CountingStatsRepo()


@pytest.fixture
def readings_repo() -> FakeReadingsRepo:
    return FakeReadingsRepo()


@pytest.fixture
def client(stats_repo: CountingStatsRepo, readings_repo: FakeReadingsRepo) -> TestClient:
    response_cache.clear()
    app.dependency_overrides[get_settings] = lambda: Settings(
        SUPABASE_URL=SUPABASE_URL,
        SUPABASE_JWT_SECRET=JWT_SECRET,
        INGEST_API_KEY=INGEST_KEY,
    )
    app.dependency_overrides[get_stats_repo] = lambda: stats_repo
    app.dependency_overrides[get_readings_repo] = lambda: readings_repo
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
    response_cache.clear()


@pytest.mark.integration
def test_stats_cache_hit_and_miss(client: TestClient, stats_repo: CountingStatsRepo) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}
    params = {"from": "2026-04-18T12:00:00Z", "to": "2026-04-18T14:00:00Z"}

    first = client.get("/stats/11111111-1111-1111-1111-111111111111", params=params, headers=headers)
    second = client.get("/stats/11111111-1111-1111-1111-111111111111", params=params, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.headers["X-Cache"] == "MISS"
    assert second.headers["X-Cache"] == "HIT"
    assert stats_repo.calls == 1


@pytest.mark.integration
def test_faults_by_zone_cache_hit_and_invalidation_on_ingest(client: TestClient) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}
    params = {"from": "2026-04-01T00:00:00Z", "to": "2026-04-18T23:59:59Z"}

    first_faults = client.get("/analytics/faults-by-zone", params=params, headers=headers)
    second_faults = client.get("/analytics/faults-by-zone", params=params, headers=headers)
    assert first_faults.status_code == 200
    assert second_faults.status_code == 200
    assert first_faults.headers["X-Cache"] == "MISS"
    assert second_faults.headers["X-Cache"] == "HIT"

    ingest_response = client.post(
        "/ingest",
        json={
            "source": "tinku-deye",
            "plant_id": "11111111-1111-1111-1111-111111111111",
            "readings": [
                {
                    "ts": "2026-04-18T12:00:00+00:00",
                    "device_id": "2402010117",
                    "values": {"Pac": 3500.0},
                }
            ],
        },
        headers={"X-Ingest-Key": INGEST_KEY},
    )
    assert ingest_response.status_code == 202

    after_ingest_faults = client.get("/analytics/faults-by-zone", params=params, headers=headers)
    assert after_ingest_faults.status_code == 200
    assert after_ingest_faults.headers["X-Cache"] == "MISS"
