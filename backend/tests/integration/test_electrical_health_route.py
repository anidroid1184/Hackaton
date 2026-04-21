"""Integration: endpoint comparativo de salud electrica."""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
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


def _row(ts: datetime, *, pf: float, voltage: float, current: float, zone: str, system: str) -> dict[str, Any]:
    return {
        "ts": ts,
        "canonical": {
            "pf": pf,
            "v_ac": voltage,
            "i_ac": current,
        },
        "tags": {
            "zone": zone,
            "system": system,
        },
    }


class FakeStatsRepo:
    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[dict[str, Any]]:
        del client_id
        del window_from
        del window_to
        base = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
        normal = [
            _row(base + timedelta(minutes=idx * 5), pf=0.97, voltage=230.0, current=11.0, zone="Zona Norte", system="huawei")
            for idx in range(6)
        ]
        gradual = [
            _row(
                base + timedelta(minutes=idx * 5),
                pf=0.98 - idx * 0.03,
                voltage=230.0,
                current=12.0,
                zone="Zona Sur",
                system="huawei",
            )
            for idx in range(6)
        ]
        sudden = [
            _row(base + timedelta(minutes=idx * 5), pf=0.96, voltage=230.0, current=10.0, zone="Zona Centro", system="deye")
            for idx in range(5)
        ]
        sudden.append(
            _row(
                base + timedelta(minutes=25),
                pf=0.96,
                voltage=230.0,
                current=22.0,
                zone="Zona Centro",
                system="deye",
            )
        )
        mixed = [
            _row(
                base + timedelta(minutes=idx * 5),
                pf=0.97 - idx * 0.02,
                voltage=228.0 - idx * 4.0,
                current=10.0 + idx * 1.8,
                zone="Zona Este",
                system="growatt",
            )
            for idx in range(6)
        ]
        return [*normal, *gradual, *sudden, *mixed]


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: Settings(
        SUPABASE_URL=SUPABASE_URL,
        SUPABASE_JWT_SECRET=JWT_SECRET,
    )
    app.dependency_overrides[get_stats_repo] = lambda: FakeStatsRepo()
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.mark.integration
def test_electrical_health_compare_by_zone_covers_four_scenarios(client: TestClient) -> None:
    token = _encode_token()
    response = client.get(
        "/stats/11111111-1111-1111-1111-111111111111/electrical-health/compare",
        params={"by": "zone", "from": "2026-04-18T12:00:00Z", "to": "2026-04-18T14:00:00Z"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["compare_by"] == "zone"
    assert len(body["groups"]) == 4

    by_group = {entry["group"]: entry for entry in body["groups"]}
    assert by_group["Zona Norte"]["trend_direction"] == "stable"
    assert by_group["Zona Norte"]["anomaly_flags"] == []

    assert by_group["Zona Sur"]["trend_direction"] == "deteriorating"
    assert "pf_degradation" in by_group["Zona Sur"]["anomaly_flags"]

    assert "current_spike" in by_group["Zona Centro"]["anomaly_flags"]
    assert by_group["Zona Centro"]["dominant_signal"] == "current"

    assert "voltage_drift" in by_group["Zona Este"]["anomaly_flags"]


@pytest.mark.integration
def test_electrical_health_compare_by_system_keeps_contract(client: TestClient) -> None:
    token = _encode_token()
    response = client.get(
        "/stats/11111111-1111-1111-1111-111111111111/electrical-health/compare",
        params={"by": "system", "from": "2026-04-18T12:00:00Z", "to": "2026-04-18T14:00:00Z"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["compare_by"] == "system"
    assert isinstance(body["groups"], list)
    assert body["groups"]
    first = body["groups"][0]
    assert "health_score" in first
    assert "dominant_signal" in first
    assert "trend_direction" in first
    assert "anomaly_flags" in first
