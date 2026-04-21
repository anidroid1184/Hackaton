"""Unit: salud electrica (PF + voltaje + corriente)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from domain.stats import summarize_electrical_health


def _sample(ts: datetime, *, pf: float, voltage: float, current: float) -> dict[str, object]:
    return {
        "ts": ts,
        "canonical": {
            "pf": pf,
            "v_ac": voltage,
            "i_ac": current,
        },
    }


@pytest.mark.unit
def test_electrical_health_stability_normal() -> None:
    base = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    samples = [
        _sample(base + timedelta(minutes=idx * 5), pf=0.97, voltage=230.0, current=11.0)
        for idx in range(6)
    ]

    summary = summarize_electrical_health(samples)

    assert summary.health_score >= 90.0
    assert summary.dominant_signal == "balanced"
    assert summary.trend_direction == "stable"
    assert summary.anomaly_flags == []


@pytest.mark.unit
def test_electrical_health_gradual_deterioration() -> None:
    base = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    samples = [
        _sample(base + timedelta(minutes=idx * 5), pf=0.98 - idx * 0.03, voltage=230.0, current=12.0)
        for idx in range(6)
    ]

    summary = summarize_electrical_health(samples)

    assert summary.health_score < 85.0
    assert summary.trend_direction == "deteriorating"
    assert "pf_degradation" in summary.anomaly_flags
    assert summary.dominant_signal == "pf"


@pytest.mark.unit
def test_electrical_health_sudden_anomaly() -> None:
    base = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    samples = [
        _sample(base + timedelta(minutes=idx * 5), pf=0.96, voltage=230.0, current=10.0)
        for idx in range(4)
    ]
    samples.append(_sample(base + timedelta(minutes=20), pf=0.96, voltage=230.0, current=22.0))

    summary = summarize_electrical_health(samples)

    assert summary.health_score < 90.0
    assert summary.trend_direction in {"stable", "deteriorating"}
    assert "current_spike" in summary.anomaly_flags
    assert summary.dominant_signal == "current"


@pytest.mark.unit
def test_electrical_health_mixed_degradation() -> None:
    base = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    samples = [
        _sample(base + timedelta(minutes=idx * 5), pf=0.97 - idx * 0.02, voltage=228.0 - idx * 4.0, current=10.0 + idx * 1.8)
        for idx in range(6)
    ]

    summary = summarize_electrical_health(samples)

    assert summary.health_score < 70.0
    assert summary.trend_direction == "deteriorating"
    assert "pf_degradation" in summary.anomaly_flags
    assert "voltage_drift" in summary.anomaly_flags
    assert "current_spike" in summary.anomaly_flags
    assert summary.dominant_signal in {"voltage", "current"}
