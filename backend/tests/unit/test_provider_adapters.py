"""Unit: contratos de adapters provider -> RawReading."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from providers.adapters import (
    adapt_deye_device_latest,
    adapt_growatt_plant_data,
    adapt_huawei_device_kpi,
)
from schemas.ingest import RawReading


@pytest.mark.unit
def test_adapt_deye_device_latest_returns_raw_readings_contract() -> None:
    payload = {
        "deviceDataList": [
            {
                "deviceSn": "2402010117",
                "collectionTime": 1776503706,
                "dataList": [
                    {"key": "BatteryVoltage", "value": "50.20", "unit": "V"},
                    {"key": "BatteryPower", "value": "1200", "unit": "W"},
                    {"key": "DC Temperature", "value": "25.20", "unit": "℃"},
                ],
            },
        ],
    }

    readings = adapt_deye_device_latest(payload)

    assert len(readings) == 1
    reading = readings[0]
    assert isinstance(reading, RawReading)
    assert reading.device_id == "2402010117"
    assert reading.ts == datetime.fromtimestamp(1776503706, tz=UTC)
    assert reading.values["BatteryVoltage"] == {"value": "50.20", "unit": "V"}
    assert reading.values["DC Temperature"] == {"value": "25.20", "unit": "℃"}


@pytest.mark.unit
def test_adapt_huawei_device_kpi_returns_raw_readings_contract() -> None:
    payload = {
        "params": {"currentTime": 1776503706197},
        "data": [
            {
                "sn": "ES21XXXX",
                "dataItemMap": {
                    "active_power": 4.235,
                    "day_cap": 12.35,
                    "power_factor": 0.999,
                    "temperature": 42.1,
                    "total_cap": 43210.88,
                },
            },
        ],
    }

    readings = adapt_huawei_device_kpi(payload)

    assert len(readings) == 1
    reading = readings[0]
    assert isinstance(reading, RawReading)
    assert reading.device_id == "ES21XXXX"
    assert reading.ts == datetime.fromtimestamp(1776503706197 / 1000, tz=UTC)
    assert reading.values["active_power"] == {"value": 4.235, "unit": "kW"}
    assert reading.values["day_cap"] == {"value": 12.35, "unit": "kWh"}
    assert reading.values["power_factor"] == {"value": 0.999, "unit": None}


@pytest.mark.unit
def test_adapt_growatt_plant_data_returns_raw_readings_contract() -> None:
    payload = {
        "data": {
            "current_power": "3.2",
            "today_energy": "8.5",
            "total_energy": "100000.0",
            "last_update_time": "2026-04-18 12:34:56",
        },
    }

    readings = adapt_growatt_plant_data(payload, device_id="growatt-plant-1")

    assert len(readings) == 1
    reading = readings[0]
    assert isinstance(reading, RawReading)
    assert reading.device_id == "growatt-plant-1"
    assert reading.ts == datetime(2026, 4, 18, 12, 34, 56, tzinfo=UTC)
    assert reading.values["current_power"] == {"value": "3.2", "unit": "kW"}
    assert reading.values["today_energy"] == {"value": "8.5", "unit": "kWh"}
    assert reading.values["total_energy"] == {"value": "100000.0", "unit": "kWh"}
