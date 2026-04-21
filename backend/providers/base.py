"""Interfaz `DataProvider` (read-side) para proveedores Deye/Tinku."""

from __future__ import annotations

from typing import Any, Protocol


class DataProvider(Protocol):
    """Proveedor read-only de datos Deye via middleware Tinku o snapshots."""

    async def fetch_station_list(self) -> dict[str, Any]: ...

    async def fetch_device_latest(self, device_sn: str) -> dict[str, Any]: ...

    async def fetch_station_history(self, station_id: int) -> dict[str, Any]: ...
