"""Proveedor Deye en modo MOCK: lee snapshots JSON en disco.

Sirve al feeder del Time Slider (sprint 2) sin pegar a Tinku ni gastar rate limit.
Los snapshots viven en `backend/tests/fixtures/tinku_snapshots/deye/`
(gitignored; generar con `uv run pytest --tinku`).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class DeyeSnapshotNotFound(FileNotFoundError):
    """Snapshot inexistente (hay que generarlo con `pytest --tinku`)."""


class DeyeMockProvider:
    """Expone los snapshots existentes tal como devolveria Deye via Tinku."""

    def __init__(self, snapshots_dir: Path) -> None:
        self._dir = snapshots_dir

    def _load(self, relative: str) -> dict[str, Any]:
        path = self._dir / relative
        if not path.is_file():
            raise DeyeSnapshotNotFound(str(path))
        with path.open(encoding="utf-8") as f:
            return json.load(f)

    async def fetch_station_list(self) -> dict[str, Any]:
        return self._load("station_list.json")

    async def fetch_device_latest(self, device_sn: str) -> dict[str, Any]:
        _ = device_sn
        return self._load("device_latest.json")

    async def fetch_station_history(self, station_id: int) -> dict[str, Any]:
        _ = station_id
        return self._load("station_history.json")
