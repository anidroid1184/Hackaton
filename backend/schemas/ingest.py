"""Schemas Pydantic para /ingest (alineados con docs/API_SPEC.yml)."""

from __future__ import annotations

from datetime import datetime
from typing import TypedDict, TypeAlias
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ValueWithUnit(TypedDict):
    """Valor telemetrico con unidad explícita opcional."""

    value: str | float | int | None
    unit: str | None


RawValue: TypeAlias = str | float | int | ValueWithUnit


class RawReading(BaseModel):
    """Lectura cruda del middleware: pares nombre-valor tal como vienen."""

    model_config = ConfigDict(extra="forbid")

    ts: datetime
    device_id: str | None = None
    values: dict[str, RawValue] = Field(min_length=1)


class IngestBatch(BaseModel):
    """Lote de lecturas crudas desde Tinku/worker."""

    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1, max_length=120)
    plant_id: UUID | None = None
    readings: list[RawReading] = Field(min_length=1, max_length=5000)


class IngestResult(BaseModel):
    """Respuesta 202 de /ingest."""

    accepted: int = Field(ge=0)
    rejected: int = Field(ge=0)
    batch_id: UUID
