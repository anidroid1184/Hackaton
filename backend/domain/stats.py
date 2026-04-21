"""Dominio de agregación de KPIs para `/stats/{client_id}`."""

from __future__ import annotations

from datetime import datetime
from typing import NotRequired, TypedDict
from uuid import UUID

from schemas.stats import (
    ClientStats,
    ElectricalHealthComparisonResponse,
    ElectricalHealthSummary,
)

_TREES_EQUIVALENT_KG_CO2 = 21.0


class StatsSample(TypedDict):
    ts: datetime
    canonical: dict[str, float]
    raw: NotRequired[dict[str, float | str]]
    tags: NotRequired[dict[str, str]]


def _safe_float(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _signal_values(samples: list[StatsSample], keys: tuple[str, ...]) -> list[float]:
    values: list[float] = []
    for sample in samples:
        canonical = sample.get("canonical", {})
        for key in keys:
            value = _safe_float(canonical.get(key))
            if value is not None:
                values.append(value)
                break
    return values


def _trend_pct(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    baseline = max(abs(values[0]), 1e-6)
    return ((values[-1] - values[0]) / baseline) * 100.0


def _max_jump_ratio(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    jumps: list[float] = []
    for idx in range(1, len(values)):
        baseline = max(abs(values[idx - 1]), 1e-6)
        jumps.append(abs(values[idx] - values[idx - 1]) / baseline)
    return max(jumps, default=0.0)


def summarize_electrical_health(samples: list[StatsSample]) -> ElectricalHealthSummary:
    ordered = sorted(samples, key=lambda s: s["ts"])
    pf_values = _signal_values(ordered, ("pf",))
    voltage_values = _signal_values(ordered, ("v_ac", "v_dc"))
    current_values = _signal_values(ordered, ("i_ac", "i_dc"))

    pf_trend = _trend_pct(pf_values)
    voltage_trend = _trend_pct(voltage_values)
    current_trend = _trend_pct(current_values)

    pf_jump = _max_jump_ratio(pf_values)
    voltage_jump = _max_jump_ratio(voltage_values)
    current_jump = _max_jump_ratio(current_values)

    pf_penalty = 0.0
    pf_flags: list[str] = []
    if pf_values:
        min_pf = min(pf_values)
        pf_penalty += max(0.0, -pf_trend) * 1.2
        if min_pf < 0.85:
            pf_penalty += (0.85 - min_pf) * 300.0
            pf_flags.append("pf_low")
        if pf_trend <= -8.0:
            pf_flags.append("pf_degradation")
        if pf_jump >= 0.12:
            pf_penalty += (pf_jump - 0.12) * 100.0
            pf_flags.append("pf_instability")

    voltage_penalty = 0.0
    voltage_flags: list[str] = []
    if voltage_values:
        voltage_penalty += abs(voltage_trend) * 1.2
        if abs(voltage_trend) >= 8.0:
            voltage_flags.append("voltage_drift")
        if voltage_jump >= 0.18:
            voltage_penalty += (voltage_jump - 0.18) * 120.0
            voltage_flags.append("voltage_spike")

    current_penalty = 0.0
    current_flags: list[str] = []
    if current_values:
        current_penalty += max(0.0, current_trend) * 0.7
        if current_trend >= 15.0:
            current_flags.append("current_rise")
        if current_jump >= 0.18:
            current_penalty += (current_jump - 0.18) * 120.0
            current_flags.append("current_spike")

    capped_pf_penalty = min(pf_penalty, 45.0)
    capped_voltage_penalty = min(voltage_penalty, 35.0)
    capped_current_penalty = min(current_penalty, 45.0)
    health_score = max(
        0.0,
        min(100.0, 100.0 - capped_pf_penalty - capped_voltage_penalty - capped_current_penalty),
    )

    dominant_penalties = {
        "pf": capped_pf_penalty,
        "voltage": capped_voltage_penalty,
        "current": capped_current_penalty,
    }
    dominant_signal = max(dominant_penalties, key=dominant_penalties.get, default="unknown")
    if dominant_penalties[dominant_signal] < 5.0:
        dominant_signal = "balanced"

    deterioration_index = max(0.0, -pf_trend) + abs(voltage_trend) * 0.6 + max(0.0, current_trend)
    improvement_index = max(0.0, pf_trend) + max(0.0, -current_trend)
    if deterioration_index >= 12.0:
        trend_direction = "deteriorating"
    elif improvement_index >= 10.0:
        trend_direction = "improving"
    else:
        trend_direction = "stable"

    anomaly_flags: list[str] = []
    for flag in (*pf_flags, *voltage_flags, *current_flags):
        if flag not in anomaly_flags:
            anomaly_flags.append(flag)

    return ElectricalHealthSummary.model_validate(
        {
            "health_score": round(health_score, 4),
            "dominant_signal": dominant_signal,
            "trend_direction": trend_direction,
            "anomaly_flags": anomaly_flags,
        }
    )


def _group_label(sample: StatsSample, compare_by: str) -> str:
    tags = sample.get("tags", {})
    raw = sample.get("raw", {})
    if compare_by == "zone":
        return str(tags.get("zone") or raw.get("zone") or raw.get("geozone") or "unknown-zone")
    return str(tags.get("system") or raw.get("system") or raw.get("vendor") or "unknown-system")


def aggregate_electrical_health_comparison(
    client_id: UUID,
    window_from: datetime,
    window_to: datetime,
    samples: list[StatsSample],
    compare_by: str,
) -> ElectricalHealthComparisonResponse:
    grouped: dict[str, list[StatsSample]] = {}
    for sample in samples:
        key = _group_label(sample, compare_by)
        grouped.setdefault(key, []).append(sample)

    groups_payload: list[dict[str, object]] = []
    for group_name, group_samples in grouped.items():
        summary = summarize_electrical_health(group_samples)
        groups_payload.append(
            {
                "group": group_name,
                "sample_count": len(group_samples),
                "health_score": summary.health_score,
                "dominant_signal": summary.dominant_signal,
                "trend_direction": summary.trend_direction,
                "anomaly_flags": summary.anomaly_flags,
            }
        )

    sorted_groups = sorted(groups_payload, key=lambda row: (row["health_score"], str(row["group"])))
    return ElectricalHealthComparisonResponse.model_validate(
        {
            "client_id": client_id,
            "window": {"from": window_from, "to": window_to},
            "compare_by": compare_by,
            "groups": sorted_groups,
        }
    )


def aggregate_client_stats(
    client_id: UUID,
    window_from: datetime,
    window_to: datetime,
    samples: list[StatsSample],
    tariff_usd_per_kwh: float,
    grid_factor_kg_co2_per_kwh: float,
) -> ClientStats:
    ordered = sorted(samples, key=lambda s: s["ts"])

    energy_kwh = 0.0
    cumulative_savings_usd = 0.0
    roi_curve: list[dict[str, float | datetime]] = []
    pf_values: list[float] = []

    for idx in range(len(ordered) - 1):
        current = ordered[idx]
        nxt = ordered[idx + 1]
        dt_hours = max((nxt["ts"] - current["ts"]).total_seconds() / 3600.0, 0.0)

        p_active_kw = _safe_float(current["canonical"].get("p_active_kw")) or 0.0
        if p_active_kw > 0.0 and dt_hours > 0.0:
            delta_energy_kwh = p_active_kw * dt_hours
            energy_kwh += delta_energy_kwh
            cumulative_savings_usd += delta_energy_kwh * tariff_usd_per_kwh
            roi_curve.append(
                {
                    "t": nxt["ts"],
                    "cumulative_savings_usd": round(cumulative_savings_usd, 6),
                }
            )

    for sample in ordered:
        pf = _safe_float(sample["canonical"].get("pf"))
        if pf is not None:
            pf_values.append(min(max(pf, 0.0), 1.0))

    power_factor_mean = round(sum(pf_values) / len(pf_values), 6) if pf_values else 0.0
    co2_avoided_kg = round(energy_kwh * grid_factor_kg_co2_per_kwh, 6)
    trees_equivalent = round(co2_avoided_kg / _TREES_EQUIVALENT_KG_CO2, 6)

    uptime_contractual_pct = 100.0 if ordered else 0.0

    return ClientStats.model_validate(
        {
            "client_id": client_id,
            "window": {"from": window_from, "to": window_to},
            "financial": {
                "savings_accumulated_usd": round(cumulative_savings_usd, 6),
                "roi_curve": roi_curve,
            },
            "environmental": {
                "co2_avoided_kg": co2_avoided_kg,
                "trees_equivalent": trees_equivalent,
            },
            "technical": {
                "energy_kwh": round(energy_kwh, 6),
                "uptime_contractual_pct": uptime_contractual_pct,
                "power_factor_mean": power_factor_mean,
                "degradation_trend_pct_per_year": 0.0,
            },
        }
    )
