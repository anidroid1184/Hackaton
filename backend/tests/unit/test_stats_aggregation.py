"""Unit: agregación de KPIs para `/stats/{client_id}`."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest
from domain.stats import aggregate_client_stats


@pytest.mark.unit
def test_aggregate_client_stats_builds_windowed_kpis() -> None:
    client_id = UUID("11111111-1111-1111-1111-111111111111")
    t0 = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    t1 = datetime(2026, 4, 18, 13, 0, tzinfo=UTC)
    t2 = datetime(2026, 4, 18, 14, 0, tzinfo=UTC)
    samples = [
        {"ts": t0, "canonical": {"p_active_kw": 2.0, "pf": 0.95}},
        {"ts": t1, "canonical": {"p_active_kw": 3.0, "pf": 0.9}},
        {"ts": t2, "canonical": {"p_active_kw": 4.0, "pf": 0.85}},
    ]

    stats = aggregate_client_stats(
        client_id=client_id,
        window_from=t0,
        window_to=t2,
        samples=samples,
        tariff_usd_per_kwh=0.2,
        grid_factor_kg_co2_per_kwh=0.43,
    )

    assert str(stats.client_id) == str(client_id)
    assert stats.window.from_ == t0
    assert stats.window.to == t2
    assert stats.technical.energy_kwh == pytest.approx(5.0)
    assert stats.financial.savings_accumulated_usd == pytest.approx(1.0)
    assert stats.environmental.co2_avoided_kg == pytest.approx(2.15)
    assert stats.environmental.trees_equivalent == pytest.approx(2.15 / 21.0)
    assert stats.technical.power_factor_mean == pytest.approx(0.9)
    assert len(stats.financial.roi_curve) == 2


@pytest.mark.unit
def test_aggregate_client_stats_returns_zeroes_when_no_samples() -> None:
    client_id = UUID("11111111-1111-1111-1111-111111111111")
    t0 = datetime(2026, 4, 18, 12, 0, tzinfo=UTC)
    t1 = datetime(2026, 4, 18, 13, 0, tzinfo=UTC)

    stats = aggregate_client_stats(
        client_id=client_id,
        window_from=t0,
        window_to=t1,
        samples=[],
        tariff_usd_per_kwh=0.2,
        grid_factor_kg_co2_per_kwh=0.43,
    )

    assert stats.financial.savings_accumulated_usd == 0.0
    assert stats.financial.roi_curve == []
    assert stats.environmental.co2_avoided_kg == 0.0
    assert stats.technical.energy_kwh == 0.0
