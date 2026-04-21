"""Integration: SupabaseReadingsRepo con httpx.MockTransport (sin red)."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from persistence.supabase_rest import SupabasePersistenceError, SupabaseReadingsRepo
from settings import Settings


def _settings() -> Settings:
    return Settings(
        supabase_url="https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="service-role-xyz",
    )


def _row() -> dict[str, Any]:
    return {
        "plant_id": "11111111-1111-1111-1111-111111111111",
        "device_id": "2402010117",
        "ts": "2026-04-18T12:00:00+00:00",
        "raw": {"Pac": 3500.0},
        "canonical": {"p_active_kw": 3.5},
    }


@pytest.mark.integration
async def test_insert_readings_posts_to_correct_endpoint_with_headers() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(201)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        repo = SupabaseReadingsRepo(settings=_settings(), client=client)
        await repo.insert_readings([_row()])

    assert len(captured) == 1
    req = captured[0]
    assert req.method == "POST"
    assert str(req.url) == "https://project.supabase.co/rest/v1/readings"
    assert req.headers["apikey"] == "service-role-xyz"
    assert req.headers["authorization"] == "Bearer service-role-xyz"
    assert req.headers["prefer"] == "return=minimal"
    assert req.headers["content-type"].startswith("application/json")

    body = json.loads(req.content.decode("utf-8"))
    assert isinstance(body, list) and len(body) == 1
    assert body[0]["canonical"] == {"p_active_kw": 3.5}


@pytest.mark.integration
async def test_insert_readings_raises_on_4xx() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text='{"message":"invalid key"}')

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        repo = SupabaseReadingsRepo(settings=_settings(), client=client)
        with pytest.raises(SupabasePersistenceError) as exc:
            await repo.insert_readings([_row()])
    assert exc.value.status_code == 401


@pytest.mark.integration
async def test_insert_readings_empty_list_is_noop() -> None:
    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover
        pytest.fail("no deberia llamar a Supabase con lista vacia")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        repo = SupabaseReadingsRepo(settings=_settings(), client=client)
        await repo.insert_readings([])
