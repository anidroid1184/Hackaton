"""Magnitudes canonicas + tabla de alias + rangos fisicos.

Regla .cursorrules #2: magnitud por rango fisico, NO por el nombre del fabricante.
Los alias aceleran casos tipicos; el rango es el fallback robusto.

Unidades canonicas:
  - potencia:       kW   (kilowatts)
  - energia:        kWh
  - voltaje:        V
  - corriente:      A
  - frecuencia:     Hz
  - temperatura:    grados Celsius
  - porcentaje:     % (0-100)
  - factor potencia: adimensional (-1..1)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Canonical(str, Enum):
    """Claves canonicas almacenadas en readings.canonical (docs/DATABASE.md)."""

    P_ACTIVE_KW = "p_active_kw"
    P_DC_KW = "p_dc_kw"
    E_DAILY_KWH = "e_daily_kwh"
    E_TOTAL_KWH = "e_total_kwh"
    V_AC = "v_ac"
    V_DC = "v_dc"
    I_AC = "i_ac"
    I_DC = "i_dc"
    PF = "pf"
    FREQ_HZ = "freq_hz"
    SOC_PCT = "soc_pct"
    T_INV_C = "t_inv_c"


@dataclass(frozen=True, slots=True)
class Range:
    """Rango fisico valido para una magnitud, en su unidad canonica."""

    low: float
    high: float

    def contains(self, value: float) -> bool:
        return self.low <= value <= self.high


CANONICAL_RANGES: dict[Canonical, Range] = {
    Canonical.P_ACTIVE_KW: Range(-1000.0, 10_000.0),
    Canonical.P_DC_KW: Range(-1000.0, 10_000.0),
    Canonical.E_DAILY_KWH: Range(0.0, 500_000.0),
    Canonical.E_TOTAL_KWH: Range(0.0, 100_000_000.0),
    Canonical.V_AC: Range(80.0, 500.0),
    Canonical.V_DC: Range(20.0, 1500.0),
    Canonical.I_AC: Range(0.0, 5000.0),
    Canonical.I_DC: Range(0.0, 5000.0),
    Canonical.PF: Range(-1.0, 1.0),
    Canonical.FREQ_HZ: Range(45.0, 65.0),
    Canonical.SOC_PCT: Range(0.0, 100.0),
    Canonical.T_INV_C: Range(-40.0, 120.0),
}


ALIASES: dict[str, Canonical] = {
    "pac": Canonical.P_ACTIVE_KW,
    "activepower": Canonical.P_ACTIVE_KW,
    "totalgridpower": Canonical.P_ACTIVE_KW,
    "p_total": Canonical.P_ACTIVE_KW,
    "totaldcinputpower": Canonical.P_DC_KW,
    "dcpowerpv1": Canonical.P_DC_KW,
    "dcpowerpv2": Canonical.P_DC_KW,
    "dcpowerpv3": Canonical.P_DC_KW,
    "dcpowerpv4": Canonical.P_DC_KW,
    "dailyactiveproduction": Canonical.E_DAILY_KWH,
    "dailyenergy": Canonical.E_DAILY_KWH,
    "totalactiveproduction": Canonical.E_TOTAL_KWH,
    "totalenergy": Canonical.E_TOTAL_KWH,
    "total_energy": Canonical.E_TOTAL_KWH,
    "gridfrequency": Canonical.FREQ_HZ,
    "acoutputfrequencyr": Canonical.FREQ_HZ,
    "acoutputfrequencys": Canonical.FREQ_HZ,
    "acoutputfrequencyt": Canonical.FREQ_HZ,
    "soc": Canonical.SOC_PCT,
    "batterysoc": Canonical.SOC_PCT,
    "acvoltagerua": Canonical.V_AC,
    "acvoltagerub": Canonical.V_AC,
    "acvoltagesub": Canonical.V_AC,
    "dcvoltagepv1": Canonical.V_DC,
    "dcvoltagepv2": Canonical.V_DC,
    "dcvoltagepv3": Canonical.V_DC,
    "dcvoltagepv4": Canonical.V_DC,
    "accurrentrua": Canonical.I_AC,
    "accurrentsua": Canonical.I_AC,
    "dccurrentpv1": Canonical.I_DC,
    "dccurrentpv2": Canonical.I_DC,
    "dccurrentpv3": Canonical.I_DC,
    "dccurrentpv4": Canonical.I_DC,
    "powerfactor": Canonical.PF,
    "pf": Canonical.PF,
    "power_factor": Canonical.PF,
    "inverterinnertemperature": Canonical.T_INV_C,
    "invertertemperature": Canonical.T_INV_C,
    "temperature": Canonical.T_INV_C,
    "dc temperature": Canonical.T_INV_C,
    "ac temperature": Canonical.T_INV_C,
    "temperature- battery": Canonical.T_INV_C,
    "active_power": Canonical.P_ACTIVE_KW,
    "day_cap": Canonical.E_DAILY_KWH,
    "total_cap": Canonical.E_TOTAL_KWH,
    "current_power": Canonical.P_ACTIVE_KW,
    "today_energy": Canonical.E_DAILY_KWH,
    "batteryvoltage": Canonical.V_DC,
    "batterypower": Canonical.P_DC_KW,
    "cumulativegridfeedin": Canonical.E_TOTAL_KWH,
}


UNIT_TO_CANONICAL_POWER: dict[str, float] = {
    "w": 0.001,
    "kw": 1.0,
    "mw": 1000.0,
}

UNIT_TO_CANONICAL_ENERGY: dict[str, float] = {
    "wh": 0.001,
    "kwh": 1.0,
    "mwh": 1000.0,
}

UNIT_TEMPERATURE_C: set[str] = {
    "c",
    "°c",
    "℃",
}
