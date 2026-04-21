"""Integration: inferencia aplicada a snapshot Deye real.

Verifica que al menos N claves de `dataList` (device_latest.json) se mapean
a canonicals esperados. Skip determinista si el snapshot no existe.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from domain.inference import infer_magnitude
from domain.magnitudes import Canonical

_SNAPSHOT = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "tinku_snapshots"
    / "deye"
    / "device_latest.json"
)


def _load_datalist() -> list[dict[str, str]]:
    payload = json.loads(_SNAPSHOT.read_text(encoding="utf-8"))
    devices = payload.get("deviceDataList") or []
    if not devices:
        return []
    return list(devices[0].get("dataList") or [])


@pytest.mark.integration
@pytest.mark.skipif(
    not _SNAPSHOT.is_file(),
    reason="device_latest.json no existe (correr `uv run pytest --tinku`)",
)
def test_datalist_is_not_empty() -> None:
    data = _load_datalist()
    assert len(data) > 0


@pytest.mark.integration
@pytest.mark.skipif(
    not _SNAPSHOT.is_file(),
    reason="device_latest.json no existe",
)
def test_expected_deye_keys_map_to_canonicals() -> None:
    data = _load_datalist()
    by_key = {item["key"]: item for item in data}

    assert "DailyActiveProduction" in by_key
    assert "TotalActiveProduction" in by_key
    assert "GridFrequency" in by_key
    assert "SOC" in by_key

    for key, expected in (
        ("DailyActiveProduction", Canonical.E_DAILY_KWH),
        ("TotalActiveProduction", Canonical.E_TOTAL_KWH),
        ("GridFrequency", Canonical.FREQ_HZ),
        ("SOC", Canonical.SOC_PCT),
    ):
        item = by_key[key]
        hit = infer_magnitude(item["key"], item["value"], item.get("unit"))
        assert hit is not None, f"{key} no se infiere"
        assert hit[0] is expected, f"{key} mapea a {hit[0]}, esperado {expected}"


@pytest.mark.integration
@pytest.mark.skipif(
    not _SNAPSHOT.is_file(),
    reason="device_latest.json no existe",
)
def test_at_least_eight_canonicals_inferred_from_snapshot() -> None:
    data = _load_datalist()
    inferred: set[Canonical] = set()
    for item in data:
        hit = infer_magnitude(item["key"], item["value"], item.get("unit"))
        if hit is not None:
            inferred.add(hit[0])
    assert len(inferred) >= 8, f"solo se infirieron {len(inferred)} canonicals: {inferred}"
