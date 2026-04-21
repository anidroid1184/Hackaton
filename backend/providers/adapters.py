"""Adapters provider -> RawReading para pipelines de ingest."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from schemas.ingest import RawReading, ValueWithUnit

_HUAWEI_UNITS: dict[str, str | None] = {
    "active_power": "kW",
    "day_cap": "kWh",
    "total_cap": "kWh",
    "power_factor": None,
    "temperature": "°C",
    "elec_freq": "Hz",
}

_GROWATT_UNITS: dict[str, str] = {
    "current_power": "kW",
    "today_energy": "kWh",
    "total_energy": "kWh",
}


def _to_utc_from_epoch_seconds(value: Any) -> datetime | None:
    if isinstance(value, int | float):
        return datetime.fromtimestamp(float(value), tz=UTC)
    if isinstance(value, str):
        try:
            return datetime.fromtimestamp(float(value), tz=UTC)
        except ValueError:
            return None
    return None


def _to_utc_from_epoch_millis(value: Any) -> datetime | None:
    if isinstance(value, int | float):
        return datetime.fromtimestamp(float(value) / 1000.0, tz=UTC)
    if isinstance(value, str):
        try:
            return datetime.fromtimestamp(float(value) / 1000.0, tz=UTC)
        except ValueError:
            return None
    return None


def _from_growatt_last_update(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC)


def adapt_deye_device_latest(payload: dict[str, Any]) -> list[RawReading]:
    """Convierte `/deye/v1.0/device/latest` a lista de RawReading."""
    out: list[RawReading] = []
    for device in payload.get("deviceDataList") or []:
        data_list = device.get("dataList") or []
        values: dict[str, ValueWithUnit] = {}
        for item in data_list:
            if not isinstance(item, dict):
                continue
            key = item.get("key")
            if not isinstance(key, str) or not key:
                continue
            values[key] = {
                "value": item.get("value"),
                "unit": item.get("unit"),
            }

        if not values:
            continue

        ts = _to_utc_from_epoch_seconds(device.get("collectionTime")) or datetime.now(tz=UTC)
        device_sn = device.get("deviceSn")
        out.append(
            RawReading(
                ts=ts,
                device_id=device_sn if isinstance(device_sn, str) else None,
                values=values,
            ),
        )
    return out


def adapt_huawei_device_kpi(payload: dict[str, Any]) -> list[RawReading]:
    """Convierte `/huawei/...getDevRealKpi` a lista de RawReading."""
    params = payload.get("params") or {}
    base_ts = _to_utc_from_epoch_millis(params.get("currentTime")) or datetime.now(tz=UTC)

    out: list[RawReading] = []
    for row in payload.get("data") or []:
        if not isinstance(row, dict):
            continue
        raw_map = row.get("dataItemMap") or {}
        if not isinstance(raw_map, dict):
            continue

        values: dict[str, ValueWithUnit] = {}
        for key, value in raw_map.items():
            if not isinstance(key, str) or value is None:
                continue
            values[key] = {"value": value, "unit": _HUAWEI_UNITS.get(key)}

        if not values:
            continue

        sn = row.get("sn")
        device_id = sn if isinstance(sn, str) else None
        out.append(RawReading(ts=base_ts, device_id=device_id, values=values))
    return out


def adapt_growatt_plant_data(
    payload: dict[str, Any],
    *,
    device_id: str | None = None,
) -> list[RawReading]:
    """Convierte `growatt /v1/plant/data` a un RawReading."""
    data = payload.get("data")
    if not isinstance(data, dict):
        return []

    values: dict[str, ValueWithUnit] = {}
    for key, unit in _GROWATT_UNITS.items():
        if key not in data:
            continue
        value = data.get(key)
        if value is None:
            continue
        values[key] = {"value": value, "unit": unit}

    if not values:
        return []

    ts = _from_growatt_last_update(data.get("last_update_time")) or datetime.now(tz=UTC)
    return [RawReading(ts=ts, device_id=device_id, values=values)]
