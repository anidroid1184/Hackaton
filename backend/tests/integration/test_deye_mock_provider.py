"""Integration: DeyeMockProvider lee los snapshots reales en disco."""

from __future__ import annotations

from pathlib import Path

import pytest
from providers.deye_mock import DeyeMockProvider, DeyeSnapshotNotFound

_SNAPDIR = Path(__file__).resolve().parents[1] / "fixtures" / "tinku_snapshots" / "deye"


@pytest.mark.integration
@pytest.mark.skipif(
    not (_SNAPDIR / "station_list.json").is_file(),
    reason="snapshots Deye no generados",
)
async def test_fetch_station_list_returns_expected_shape() -> None:
    provider = DeyeMockProvider(snapshots_dir=_SNAPDIR)
    payload = await provider.fetch_station_list()
    assert payload.get("code") == "1000000"
    assert isinstance(payload.get("stationList"), list)


@pytest.mark.integration
@pytest.mark.skipif(
    not (_SNAPDIR / "device_latest.json").is_file(),
    reason="snapshots Deye no generados",
)
async def test_fetch_device_latest_returns_datalist() -> None:
    provider = DeyeMockProvider(snapshots_dir=_SNAPDIR)
    payload = await provider.fetch_device_latest("2402010117")
    devices = payload.get("deviceDataList")
    assert isinstance(devices, list) and len(devices) > 0
    assert isinstance(devices[0].get("dataList"), list)


@pytest.mark.integration
async def test_missing_snapshot_raises(tmp_path: Path) -> None:
    provider = DeyeMockProvider(snapshots_dir=tmp_path)
    with pytest.raises(DeyeSnapshotNotFound):
        await provider.fetch_station_list()
