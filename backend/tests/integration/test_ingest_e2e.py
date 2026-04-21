"""Integration E2E: snapshot Deye -> /ingest -> PostgREST mock. Sin red externa.

Flujo completo dentro del proceso:
  1. DeyeMockProvider carga snapshot real de disco
  2. transformamos `dataList` -> IngestBatch
  3. POST /ingest con X-Ingest-Key valida
  4. SupabaseReadingsRepo apuntado a un httpx.MockTransport que captura payload
  5. verificamos que PostgREST recibio filas canonicas correctas
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from jwt_auth import get_settings
from main import app
from persistence.supabase_rest import SupabaseReadingsRepo
from providers.deye_mock import DeyeMockProvider
from routers.ingest import get_readings_repo
from settings import Settings

_INGEST_KEY = "e2e-ingest-key"
_SNAPDIR = Path(__file__).resolve().parents[1] / "fixtures" / "tinku_snapshots" / "deye"


def _datalist_to_values(data_list: list[dict[str, str]]) -> dict[str, Any]:
    """Convierte el `dataList` Deye en el shape `values` del RawReading.

    Como `values` esperado es `dict[str, str | float]`, guardamos valor y
    cabeceramos el caso sin unidad para los tests E2E: el motor infiere por
    alias igual (Pac, GridFrequency, SOC tienen alias con rango amplio).
    """
    return {item["key"]: item["value"] for item in data_list if "key" in item}


@pytest.mark.integration
@pytest.mark.skipif(
    not (_SNAPDIR / "device_latest.json").is_file(),
    reason="snapshot device_latest.json no existe",
)
async def test_snapshot_to_ingest_to_mock_postgrest_end_to_end() -> None:
    provider = DeyeMockProvider(snapshots_dir=_SNAPDIR)
    snapshot = await provider.fetch_device_latest("2402010117")
    device = snapshot["deviceDataList"][0]
    data_list = device["dataList"]
    ts = datetime.fromtimestamp(int(device["collectionTime"]), tz=UTC).isoformat()

    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(201)

    transport = httpx.MockTransport(handler)
    mock_client = httpx.AsyncClient(transport=transport)

    def _settings() -> Settings:
        return Settings(
            INGEST_API_KEY=_INGEST_KEY,
            supabase_url="https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="service-role-xyz",
        )

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[get_readings_repo] = lambda: SupabaseReadingsRepo(
        settings=_settings(),
        client=mock_client,
    )

    try:
        values = _datalist_to_values(data_list)
        payload = {
            "source": "tinku-deye",
            "plant_id": "11111111-1111-1111-1111-111111111111",
            "readings": [
                {
                    "ts": ts,
                    "device_id": device["deviceSn"],
                    "values": values,
                },
            ],
        }

        with TestClient(app) as client:
            response = client.post(
                "/ingest",
                json=payload,
                headers={"X-Ingest-Key": _INGEST_KEY},
            )
    finally:
        app.dependency_overrides.clear()
        await mock_client.aclose()

    assert response.status_code == 202
    body = response.json()
    assert body["accepted"] == 1

    assert len(captured) == 1
    supabase_req = captured[0]
    assert str(supabase_req.url).endswith("/rest/v1/readings")
    rows = json.loads(supabase_req.content.decode("utf-8"))
    assert len(rows) == 1
    canonical = rows[0]["canonical"]
    assert "freq_hz" in canonical or "soc_pct" in canonical or "p_active_kw" in canonical
    assert len(canonical) >= 5, f"pocos canonicals en E2E: {canonical}"
