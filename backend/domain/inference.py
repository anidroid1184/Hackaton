"""Motor de Inferencia de Magnitud (puro, sin I/O).

Dos fases:
  1. Alias conocidos (`ALIASES`): nombres tipicos de fabricantes -> Canonical.
  2. Fallback por rango fisico + unidad: deduce la magnitud si el valor cae
     en el rango esperado de una Canonical compatible con la unidad dada.

Si ambos fallan, devuelve `None` (el valor queda en `raw`, nunca en `canonical`).
"""

from __future__ import annotations

from typing import Any, TypedDict
from uuid import UUID

from schemas.ingest import RawReading

from domain.magnitudes import (
    ALIASES,
    CANONICAL_RANGES,
    UNIT_TO_CANONICAL_ENERGY,
    UNIT_TO_CANONICAL_POWER,
    UNIT_TEMPERATURE_C,
    Canonical,
)


class CanonicalReading(TypedDict):
    """Fila lista para insertar en Supabase `readings`."""

    plant_id: str | None
    device_id: str | None
    ts: str
    raw: dict[str, Any]
    canonical: dict[str, float]


def _to_float(value: Any) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _normalize_unit(unit: str | None) -> str:
    if not unit:
        return ""
    normalized = unit.strip().lower()
    if normalized in UNIT_TEMPERATURE_C:
        return "c"
    return normalized


def _convert_power_to_kw(value: float, unit: str) -> float | None:
    factor = UNIT_TO_CANONICAL_POWER.get(unit)
    if factor is None:
        return None
    return value * factor


def _convert_energy_to_kwh(value: float, unit: str) -> float | None:
    factor = UNIT_TO_CANONICAL_ENERGY.get(unit)
    if factor is None:
        return None
    return value * factor


def _infer_from_alias(
    key: str,
    raw_value: float,
    unit: str,
) -> tuple[Canonical, float] | None:
    canonical = ALIASES.get(key)
    if canonical is None:
        return None

    value = _convert_to_canonical_unit(canonical, raw_value, unit)
    if value is None:
        return None

    physical_range = CANONICAL_RANGES.get(canonical)
    if physical_range is not None and not physical_range.contains(value):
        return None
    return canonical, value


def _convert_to_canonical_unit(
    canonical: Canonical,
    value: float,
    unit: str,
) -> float | None:
    """Convierte `value` a la unidad canonica. Unit vacia usa el default del fabricante.

    Default por canonical (convencion Deye / dataList):
      - potencia (P_*_KW): W
      - energia (E_*_KWH): kWh
      - resto: sin conversion
    """
    if canonical in {Canonical.P_ACTIVE_KW, Canonical.P_DC_KW}:
        effective_unit = unit or "w"
        return _convert_power_to_kw(value, effective_unit)
    if canonical in {Canonical.E_DAILY_KWH, Canonical.E_TOTAL_KWH}:
        effective_unit = unit or "kwh"
        return _convert_energy_to_kwh(value, effective_unit)
    return value


def _infer_from_range(
    key_lower: str,
    raw_value: float,
    unit: str,
) -> tuple[Canonical, float] | None:
    if unit == "hz":
        if CANONICAL_RANGES[Canonical.FREQ_HZ].contains(raw_value):
            return Canonical.FREQ_HZ, raw_value
        return None

    if unit == "%":
        if CANONICAL_RANGES[Canonical.SOC_PCT].contains(raw_value):
            return Canonical.SOC_PCT, raw_value
        return None

    if unit == "v":
        is_dc_hint = any(hint in key_lower for hint in ("dc", "pv"))
        if is_dc_hint and CANONICAL_RANGES[Canonical.V_DC].contains(raw_value):
            return Canonical.V_DC, raw_value
        if CANONICAL_RANGES[Canonical.V_AC].contains(raw_value):
            return Canonical.V_AC, raw_value
        return None

    if unit in UNIT_TO_CANONICAL_POWER:
        converted = _convert_power_to_kw(raw_value, unit)
        if converted is not None and CANONICAL_RANGES[Canonical.P_ACTIVE_KW].contains(
            converted,
        ):
            return Canonical.P_ACTIVE_KW, converted
        return None

    if unit == "a":
        is_dc_hint = any(hint in key_lower for hint in ("dc", "pv"))
        rng = CANONICAL_RANGES[Canonical.I_DC if is_dc_hint else Canonical.I_AC]
        if rng.contains(raw_value):
            return (Canonical.I_DC if is_dc_hint else Canonical.I_AC), raw_value
        return None

    if unit == "c":
        if CANONICAL_RANGES[Canonical.T_INV_C].contains(raw_value):
            return Canonical.T_INV_C, raw_value
        return None

    return None


def infer_magnitude(
    key: str,
    value: float | str,
    unit: str | None,
) -> tuple[Canonical, float] | None:
    """Infiere la magnitud canonica de `(key, value, unit)` o devuelve None."""
    raw_value = _to_float(value)
    if raw_value is None:
        return None

    unit_norm = _normalize_unit(unit)
    key_lower = (key or "").strip().lower()

    alias_hit = _infer_from_alias(key_lower, raw_value, unit_norm)
    if alias_hit is not None:
        return alias_hit

    return _infer_from_range(key_lower, raw_value, unit_norm)


def _extract_value_and_unit(raw_value: Any) -> tuple[Any, str | None]:
    """Si el valor viene como dict {value, unit} lo desempaqueta."""
    if isinstance(raw_value, dict):
        return raw_value.get("value"), raw_value.get("unit")
    return raw_value, None


def normalize_batch(
    readings: list[RawReading],
    plant_id: UUID | None = None,
) -> tuple[list[CanonicalReading], int]:
    """Convierte un batch de RawReading en filas listas para PostgREST.

    Devuelve `(filas_canonicas, total_rechazadas)` donde `total_rechazadas`
    es el numero de pares `(key,value)` individuales no inferibles a traves
    de todas las lecturas.
    """
    rows: list[CanonicalReading] = []
    rejected_total = 0
    plant_id_str = str(plant_id) if plant_id is not None else None

    for reading in readings:
        canonical_map: dict[str, float] = {}
        for raw_key, raw_value in reading.values.items():
            value_only, unit = _extract_value_and_unit(raw_value)
            hit = infer_magnitude(raw_key, value_only, unit)
            if hit is None:
                rejected_total += 1
                continue
            canonical_key, canonical_value = hit
            canonical_map[canonical_key.value] = canonical_value

        rows.append(
            CanonicalReading(
                plant_id=plant_id_str,
                device_id=reading.device_id,
                ts=reading.ts.isoformat(),
                raw=dict(reading.values),
                canonical=canonical_map,
            ),
        )

    return rows, rejected_total
