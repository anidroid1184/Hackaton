"""Proveedor Deye en modo LIVE: httpx async -> middleware Tinku (techos.thetribu.dev).

Auth: header `Authorization: tk_...` (API key equipo, ver docs/api/deye/README.md).
Rate limit: 60 rpm; respeta backoff si Tinku responde 429.
"""

from __future__ import annotations

from typing import Any

import httpx
from settings import Settings


class DeyeUpstreamError(RuntimeError):
    """Error HTTP aguas arriba al consultar Tinku/Deye."""

    def __init__(self, status_code: int, body: str) -> None:
        super().__init__(f"tinku deye error {status_code}: {body[:200]}")
        self.status_code = status_code
        self.body = body


class DeyeLiveProvider:
    """Cliente minimo Deye via Tinku. No cachea; eso vive en capas superiores."""

    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    def _url(self, path: str) -> str:
        base = self._settings.tinku_base_url.rstrip("/")
        return f"{base}/deye/{path.lstrip('/')}"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self._settings.tinku_api_key,
            "Content-Type": "application/json",
        }

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        client = self._client or httpx.AsyncClient(timeout=httpx.Timeout(30.0))
        owns = self._client is None
        try:
            response = await client.post(
                self._url(path),
                json=body,
                headers=self._headers(),
            )
        finally:
            if owns:
                await client.aclose()

        if response.status_code >= 400:
            raise DeyeUpstreamError(response.status_code, response.text)
        return response.json()

    async def fetch_station_list(self) -> dict[str, Any]:
        return await self._post("v1.0/station/list", {"page": 1, "size": 20})

    async def fetch_device_latest(self, device_sn: str) -> dict[str, Any]:
        return await self._post("v1.0/device/latest", {"deviceList": [device_sn]})

    async def fetch_station_history(self, station_id: int) -> dict[str, Any]:
        return await self._post(
            "v1.0/station/history",
            {"stationId": station_id, "granularity": 2},
        )
