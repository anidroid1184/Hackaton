"""Repositorio de lecturas para `GET /stats/{client_id}` vía PostgREST."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Protocol
from uuid import UUID

import httpx
from domain.stats import StatsSample
from settings import Settings


class StatsRepo(Protocol):
    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[StatsSample]: ...


class MockStatsRepo:
    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[StatsSample]:
        del client_id

        if window_from >= window_to:
            return []

        # 25 puntos (~1 por hora para ventana de 24h) para curvas suaves.
        points = 25
        total_seconds = (window_to - window_from).total_seconds()
        step_seconds = max(total_seconds / (points - 1), 60.0)

        out: list[StatsSample] = []
        for idx in range(points):
            ts = window_from + timedelta(seconds=idx * step_seconds)
            if ts > window_to:
                ts = window_to
            # Perfil simple: potencia activa entre 2.5kW y 5.5kW, PF ~0.86-0.98
            phase = idx / (points - 1)
            p_active_kw = 2.5 + (3.0 * phase)
            pf = 0.86 + (0.12 * (1.0 - abs(0.5 - phase) * 2.0))
            out.append(
                {
                    "ts": ts,
                    "canonical": {
                        "p_active_kw": float(p_active_kw),
                        "pf": float(min(max(pf, 0.0), 1.0)),
                    },
                }
            )

        # Asegura orden y unicidad razonable.
        return sorted(out, key=lambda row: row["ts"])


class SupabaseStatsRepo:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    def _build_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=httpx.Timeout(10.0))

    def _endpoint(self) -> str:
        base = self._settings.supabase_url.rstrip("/")
        return f"{base}/rest/v1/readings"

    def _headers(self) -> dict[str, str]:
        key = self._settings.service_role_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def fetch_readings_for_client(
        self,
        client_id: UUID,
        window_from: datetime,
        window_to: datetime,
    ) -> list[StatsSample]:
        params = {
            "select": "ts,canonical,raw,plants!inner(client_id,zones(geozone)),devices(vendor_slug)",
            "plants.client_id": f"eq.{client_id}",
            "ts": f"gte.{window_from.isoformat()}",
            "and": f"(ts.lte.{window_to.isoformat()})",
            "order": "ts.asc",
        }
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(
                self._endpoint(),
                params=params,
                headers=self._headers(),
            )
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            return []

        payload = response.json()
        if not isinstance(payload, list):
            return []

        rows: list[StatsSample] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            raw_ts = item.get("ts")
            canonical = item.get("canonical")
            if not isinstance(raw_ts, str) or not isinstance(canonical, dict):
                continue
            normalized_ts = raw_ts.replace("Z", "+00:00")
            try:
                ts = datetime.fromisoformat(normalized_ts)
            except ValueError:
                continue
            parsed_canonical: dict[str, float] = {}
            for key, value in canonical.items():
                if isinstance(value, (int, float)):
                    parsed_canonical[key] = float(value)
            raw = item.get("raw")
            parsed_raw: dict[str, float | str] = {}
            if isinstance(raw, dict):
                for key, value in raw.items():
                    if isinstance(value, (int, float, str)):
                        parsed_raw[key] = value

            tags: dict[str, str] = {}
            plants = item.get("plants")
            if isinstance(plants, dict):
                zones = plants.get("zones")
                if isinstance(zones, dict):
                    geozone = zones.get("geozone")
                    if isinstance(geozone, str) and geozone:
                        tags["zone"] = geozone

            devices = item.get("devices")
            if isinstance(devices, dict):
                vendor_slug = devices.get("vendor_slug")
                if isinstance(vendor_slug, str) and vendor_slug:
                    tags["system"] = vendor_slug

            row: StatsSample = {"ts": ts, "canonical": parsed_canonical}
            if parsed_raw:
                row["raw"] = parsed_raw
            if tags:
                row["tags"] = tags
            rows.append(row)
        return rows
