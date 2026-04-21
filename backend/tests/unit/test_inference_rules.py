"""Unit: reglas puras de inferencia de magnitud (sin I/O)."""

from __future__ import annotations

import pytest
from domain.inference import infer_magnitude
from domain.magnitudes import Canonical


@pytest.mark.unit
class TestInferMagnitudeByAlias:
    """Alias conocidos (seed table) deben mapear sin depender del rango."""

    def test_pac_watts_converts_to_kw(self) -> None:
        result = infer_magnitude("Pac", 3500.0, "W")
        assert result == (Canonical.P_ACTIVE_KW, 3.5)

    def test_total_grid_power_watts_to_kw(self) -> None:
        result = infer_magnitude("TotalGridPower", 2000.0, "W")
        assert result == (Canonical.P_ACTIVE_KW, 2.0)

    def test_daily_active_production_kwh(self) -> None:
        result = infer_magnitude("DailyActiveProduction", 12.5, "kWh")
        assert result == (Canonical.E_DAILY_KWH, 12.5)

    def test_total_active_production_kwh(self) -> None:
        result = infer_magnitude("TotalActiveProduction", 12538.2, "kWh")
        assert result == (Canonical.E_TOTAL_KWH, 12538.2)

    def test_soc_percent(self) -> None:
        result = infer_magnitude("SOC", 80.0, "%")
        assert result == (Canonical.SOC_PCT, 80.0)

    def test_grid_frequency_hz(self) -> None:
        result = infer_magnitude("GridFrequency", 60.02, "Hz")
        assert result == (Canonical.FREQ_HZ, 60.02)

    def test_ac_output_frequency_hz(self) -> None:
        result = infer_magnitude("ACOutputFrequencyR", 60.02, "Hz")
        assert result == (Canonical.FREQ_HZ, 60.02)

    def test_dc_voltage_pv_alias(self) -> None:
        """DCVoltagePV1 con valor en rango DC alto matchea por alias."""
        result = infer_magnitude("DCVoltagePV1", 350.0, "V")
        assert result == (Canonical.V_DC, 350.0)


@pytest.mark.unit
class TestInferMagnitudeByRange:
    """Fallback por rango fisico cuando el nombre no matchea alias."""

    def test_unknown_name_hz_in_grid_range(self) -> None:
        result = infer_magnitude("desconocido", 60.02, "Hz")
        assert result == (Canonical.FREQ_HZ, 60.02)

    def test_unknown_name_percent_soc_range(self) -> None:
        result = infer_magnitude("BatteryCharge", 75.0, "%")
        assert result == (Canonical.SOC_PCT, 75.0)

    def test_unknown_name_volt_ac_range(self) -> None:
        result = infer_magnitude("Vgrid", 120.3, "V")
        assert result == (Canonical.V_AC, 120.3)

    def test_watts_convert_to_kw(self) -> None:
        result = infer_magnitude("unknownPower", 1500.0, "W")
        assert result == (Canonical.P_ACTIVE_KW, 1.5)


@pytest.mark.unit
class TestInferMagnitudeRejects:
    """Casos que deben devolver None (quedan en `raw`, no en `canonical`)."""

    def test_dc_voltage_below_physical_range_returns_none(self) -> None:
        """DCVoltagePV1=0.90 V: alias no aplica (rango invalido), fallback tampoco."""
        result = infer_magnitude("unknownPV", 0.9, "V")
        assert result is None

    def test_hz_out_of_grid_range(self) -> None:
        result = infer_magnitude("freq", 200.0, "Hz")
        assert result is None

    def test_percent_out_of_range(self) -> None:
        result = infer_magnitude("pct", 150.0, "%")
        assert result is None

    def test_unit_none_and_ambiguous_name(self) -> None:
        result = infer_magnitude("ambiguo", 42.0, None)
        assert result is None

    def test_unit_none_and_empty_name(self) -> None:
        result = infer_magnitude("", 42.0, None)
        assert result is None


@pytest.mark.unit
class TestInferMagnitudeValueCoercion:
    """Cadenas numericas se parsean; no numericas se rechazan."""

    def test_string_numeric_is_parsed(self) -> None:
        result = infer_magnitude("Pac", "3500.00", "W")
        assert result == (Canonical.P_ACTIVE_KW, 3.5)

    def test_string_non_numeric_returns_none(self) -> None:
        result = infer_magnitude("Pac", "NaN-whatever", "W")
        assert result is None
