"""Schemas para `GET /stats/{client_id}`."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StatsWindow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: datetime = Field(alias="from")
    to: datetime


class RoiPoint(BaseModel):
    t: datetime
    cumulative_savings_usd: float


class FinancialStats(BaseModel):
    savings_accumulated_usd: float = Field(ge=0.0)
    roi_curve: list[RoiPoint]


class EnvironmentalStats(BaseModel):
    co2_avoided_kg: float = Field(ge=0.0)
    trees_equivalent: float = Field(ge=0.0)


class TechnicalStats(BaseModel):
    energy_kwh: float = Field(ge=0.0)
    uptime_contractual_pct: float = Field(ge=0.0, le=100.0)
    power_factor_mean: float = Field(ge=0.0, le=1.0)
    degradation_trend_pct_per_year: float


class ElectricalHealthSummary(BaseModel):
    health_score: float = Field(ge=0.0, le=100.0)
    dominant_signal: Literal["pf", "voltage", "current", "balanced", "unknown"]
    trend_direction: Literal["improving", "stable", "deteriorating"]
    anomaly_flags: list[str]


class ElectricalHealthComparisonGroup(ElectricalHealthSummary):
    group: str
    sample_count: int = Field(ge=0)


class ElectricalHealthComparisonResponse(BaseModel):
    client_id: UUID
    window: StatsWindow
    compare_by: Literal["zone", "system"]
    groups: list[ElectricalHealthComparisonGroup]


class ClientStats(BaseModel):
    client_id: UUID
    window: StatsWindow
    financial: FinancialStats
    environmental: EnvironmentalStats
    technical: TechnicalStats
