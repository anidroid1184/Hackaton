"""Integration: POST /ingest con FakeReadingsRepo inyectado."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from jwt_auth import get_settings
from main import app
from persistence.supabase_rest import FakeReadingsRepo
from routers.ingest import get_readings_repo
from settings import Settings

_INGEST_KEY = "test-ingest-key"
_TS = "2026-04-18T12:00:00+00:00"


@pytest.fixture
def fake_repo() -> FakeReadingsRepo:
    return FakeReadingsRepo()


@pytest.fixture
def client(fake_repo: FakeReadingsRepo) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: Settings(
        INGEST_API_KEY=_INGEST_KEY,
    )
    app.dependency_overrides[get_readings_repo] = lambda: fake_repo
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.mark.integration
def test_missing_header_returns_401(client: TestClient) -> None:
    response = client.post(
        "/ingest",
        json={"source": "tinku", "readings": [{"ts": _TS, "values": {"Pac": 3500.0}}]},
    )
    assert response.status_code == 401


@pytest.mark.integration
def test_invalid_key_returns_401(client: TestClient) -> None:
    response = client.post(
        "/ingest",
        json={"source": "tinku", "readings": [{"ts": _TS, "values": {"Pac": 3500.0}}]},
        headers={"X-Ingest-Key": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.integration
def test_valid_batch_returns_202_and_persists_canonicals(
    client: TestClient,
    fake_repo: FakeReadingsRepo,
) -> None:
    response = client.post(
        "/ingest",
        json={
            "source": "tinku-deye",
            "plant_id": "11111111-1111-1111-1111-111111111111",
            "readings": [
                {
                    "ts": _TS,
                    "device_id": "2402010117",
                    "values": {
                        "Pac": 3500.0,
                        "GridFrequency": 60.02,
                        "SOC": 80.0,
                    },
                },
            ],
        },
        headers={"X-Ingest-Key": _INGEST_KEY},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["accepted"] == 1
    assert body["rejected"] == 0
    assert isinstance(body["batch_id"], str)

    assert len(fake_repo.rows) == 1
    row = fake_repo.rows[0]
    assert row["canonical"] == {
        "p_active_kw": 3.5,
        "freq_hz": 60.02,
        "soc_pct": 80.0,
    }


@pytest.mark.integration
def test_empty_readings_returns_422(client: TestClient) -> None:
    response = client.post(
        "/ingest",
        json={"source": "tinku", "readings": []},
        headers={"X-Ingest-Key": _INGEST_KEY},
    )
    assert response.status_code == 422


@pytest.mark.integration
def test_missing_source_returns_422(client: TestClient) -> None:
    response = client.post(
        "/ingest",
        json={"readings": [{"ts": _TS, "values": {"Pac": 3500.0}}]},
        headers={"X-Ingest-Key": _INGEST_KEY},
    )
    assert response.status_code == 422
