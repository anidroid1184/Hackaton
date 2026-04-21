"""Unit: mapeo de magnitudes para Huawei, Growatt y Deye."""

from __future__ import annotations

import pytest
from domain.inference import infer_magnitude
from domain.magnitudes import Canonical


@pytest.mark.unit
@pytest.mark.parametrize(
    ("key", "value", "unit", "expected"),
    [
        ("active_power", 4.235, "kW", (Canonical.P_ACTIVE_KW, 4.235)),
        ("day_cap", 12.35, "kWh", (Canonical.E_DAILY_KWH, 12.35)),
        ("power_factor", 0.999, None, (Canonical.PF, 0.999)),
        ("current_power", "3.2", "kW", (Canonical.P_ACTIVE_KW, 3.2)),
        ("today_energy", "8.5", "kWh", (Canonical.E_DAILY_KWH, 8.5)),
        ("total_energy", "100000.0", "kWh", (Canonical.E_TOTAL_KWH, 100000.0)),
        ("BatteryVoltage", "50.20", "V", (Canonical.V_DC, 50.2)),
        ("BatteryPower", "1200", "W", (Canonical.P_DC_KW, 1.2)),
        (
            "CumulativeGridFeedIn",
            "11352.50",
            "kWh",
            (Canonical.E_TOTAL_KWH, 11352.5),
        ),
        ("DC Temperature", "25.20", "℃", (Canonical.T_INV_C, 25.2)),
    ],
)
def test_infer_magnitude_multi_provider_aliases(
    key: str,
    value: float | str,
    unit: str | None,
    expected: tuple[Canonical, float],
) -> None:
    assert infer_magnitude(key, value, unit) == expected


@pytest.mark.unit
def test_infer_temperature_by_range_with_celsius_symbol() -> None:
    assert infer_magnitude("sensor-temp", 31.5, "℃") == (Canonical.T_INV_C, 31.5)
