"""Persistencia de analitica para `GET /analytics/faults-by-zone`."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Protocol

import httpx
from settings import Settings


class AnalyticsPersistenceError(RuntimeError):
    """Error de persistencia analitica recuperable en router."""


class FaultsByZoneRepo(Protocol):
    async def fetch_faults_by_zone(
        self,
        *,
        window_from: datetime,
        window_to: datetime,
        organization_id: str | None,
        client_id: str | None,
        geozone: str | None,
    ) -> dict[str, Any]: ...


class SupabaseFaultsByZoneRepo:
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
        return f"{base}/rest/v1/alerts"

    def _zones_endpoint(self) -> str:
        base = self._settings.supabase_url.rstrip("/")
        return f"{base}/rest/v1/zones"

    def _headers(self) -> dict[str, str]:
        key = self._settings.service_role_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _to_zulu(value: datetime) -> str:
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")

    async def fetch_faults_by_zone(
        self,
        *,
        window_from: datetime,
        window_to: datetime,
        organization_id: str | None,
        client_id: str | None,
        geozone: str | None,
    ) -> dict[str, Any]:
        if not self._settings.supabase_url or not self._settings.service_role_key:
            raise AnalyticsPersistenceError("Missing Supabase persistence settings")

        payload: dict[str, Any] = {
            "window": {
                "from": self._to_zulu(window_from),
                "to": self._to_zulu(window_to),
            },
            "buckets": [],
        }

        params: dict[str, str] = {
            "select": "type,plants!inner(zone_id,nominal_power_kw,clients!inner(id,organization_id))",
            "ts": f"gte.{window_from.isoformat()}",
            "and": f"(ts.lte.{window_to.isoformat()})",
            "order": "ts.asc",
        }
        if organization_id:
            params["plants.clients.organization_id"] = f"eq.{organization_id}"
        if client_id:
            params["plants.clients.id"] = f"eq.{client_id}"
        if geozone:
            zone_ids = await self._fetch_zone_ids_by_geozone(geozone)
            if not zone_ids:
                return payload
            params["plants.zone_id"] = f"in.({','.join(sorted(zone_ids))})"

        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise AnalyticsPersistenceError("Error calling Supabase alerts endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise AnalyticsPersistenceError(
                f"Supabase alerts query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise AnalyticsPersistenceError("Invalid response payload from Supabase alerts")

        zone_ids: set[str] = set()
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            if not isinstance(plant, dict):
                continue
            zone_id = plant.get("zone_id")
            if isinstance(zone_id, str) and zone_id:
                zone_ids.add(zone_id)

        zones_map = await self._fetch_zones_map(zone_ids)
        rollup: dict[str, dict[str, Any]] = {}
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            if not isinstance(plant, dict):
                continue
            zone_id = plant.get("zone_id")
            geozone = "Sin zona"
            if isinstance(zone_id, str) and zone_id:
                geozone = zones_map.get(zone_id, "Sin zona")

            fault_type = item.get("type")
            if not isinstance(fault_type, str) or not fault_type:
                fault_type = "unknown"

            nominal_kw = plant.get("nominal_power_kw")
            if not isinstance(nominal_kw, (int, float)):
                nominal_kw = 0.0
            nominal_kw = float(nominal_kw)

            bucket = rollup.setdefault(
                geozone,
                {
                    "geozone": geozone,
                    "fault_count": 0,
                    "normalized_rate": 0.0,
                    "fault_types": {},
                    "capacity_kw": 0.0,
                },
            )
            bucket["fault_count"] += 1
            bucket["capacity_kw"] += max(nominal_kw, 0.0)
            types = bucket["fault_types"]
            types[fault_type] = int(types.get(fault_type, 0)) + 1

        buckets: list[dict[str, Any]] = []
        for zone, aggregated in sorted(rollup.items(), key=lambda row: row[0]):
            capacity_kw = float(aggregated.pop("capacity_kw", 0.0))
            fault_count = int(aggregated.get("fault_count", 0))
            normalized_rate = 0.0
            if capacity_kw > 0:
                normalized_rate = round((fault_count / capacity_kw) * 1000.0, 4)
            type_map = aggregated.get("fault_types", {})
            fault_types: list[dict[str, Any]] = []
            if isinstance(type_map, dict):
                for fault_type, count in sorted(type_map.items(), key=lambda row: row[0]):
                    fault_types.append({"type": fault_type, "count": int(count)})
            buckets.append(
                {
                    "geozone": zone,
                    "fault_count": fault_count,
                    "normalized_rate": normalized_rate,
                    "fault_types": fault_types,
                }
            )
        payload["buckets"] = buckets
        return payload

    async def _fetch_zone_ids_by_geozone(self, geozone: str) -> set[str]:
        params = {
            "select": "id",
            "geozone": f"eq.{geozone}",
        }
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._zones_endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise AnalyticsPersistenceError("Error calling Supabase zones endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()
        if response.status_code >= 400:
            raise AnalyticsPersistenceError(
                f"Supabase zones query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise AnalyticsPersistenceError("Invalid response payload from Supabase zones")
        out: set[str] = set()
        for item in body:
            if not isinstance(item, dict):
                continue
            zone_id = item.get("id")
            if isinstance(zone_id, str) and zone_id:
                out.add(zone_id)
        return out

    async def _fetch_zones_map(self, zone_ids: set[str]) -> dict[str, str]:
        if not zone_ids:
            return {}
        params = {
            "select": "id,geozone,name",
            "id": f"in.({','.join(sorted(zone_ids))})",
        }
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._zones_endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise AnalyticsPersistenceError("Error calling Supabase zones endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()
        if response.status_code >= 400:
            raise AnalyticsPersistenceError(
                f"Supabase zones query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise AnalyticsPersistenceError("Invalid response payload from Supabase zones")
        out: dict[str, str] = {}
        for item in body:
            if not isinstance(item, dict):
                continue
            row_id = item.get("id")
            if not isinstance(row_id, str):
                continue
            geozone = item.get("geozone")
            if isinstance(geozone, str) and geozone:
                out[row_id] = geozone
                continue
            name = item.get("name")
            if isinstance(name, str) and name:
                out[row_id] = name
        return out
