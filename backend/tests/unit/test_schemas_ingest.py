"""Unit: validacion Pydantic de los schemas de /ingest."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from schemas.ingest import IngestBatch, RawReading

_TS = datetime(2026, 4, 18, 12, 0, 0, tzinfo=UTC)


@pytest.mark.unit
def test_ingest_batch_rejects_empty_readings() -> None:
    with pytest.raises(ValidationError):
        IngestBatch(source="tinku", readings=[])


@pytest.mark.unit
def test_ingest_batch_requires_source() -> None:
    with pytest.raises(ValidationError):
        IngestBatch(readings=[RawReading(ts=_TS, values={"Pac": 1.0})])  # type: ignore[call-arg]


@pytest.mark.unit
def test_ingest_batch_rejects_invalid_plant_id_uuid() -> None:
    with pytest.raises(ValidationError):
        IngestBatch(
            source="tinku",
            plant_id="not-a-uuid",  # type: ignore[arg-type]
            readings=[RawReading(ts=_TS, values={"Pac": 1.0})],
        )


@pytest.mark.unit
def test_raw_reading_requires_non_empty_values() -> None:
    with pytest.raises(ValidationError):
        RawReading(ts=_TS, values={})


@pytest.mark.unit
def test_raw_reading_requires_iso_datetime() -> None:
    with pytest.raises(ValidationError):
        RawReading(ts="no-fecha", values={"Pac": 1.0})  # type: ignore[arg-type]


@pytest.mark.unit
def test_ingest_batch_accepts_valid_payload() -> None:
    batch = IngestBatch(
        source="tinku-deye",
        plant_id="11111111-1111-1111-1111-111111111111",
        readings=[RawReading(ts=_TS, values={"Pac": 3500.0})],
    )
    assert batch.source == "tinku-deye"
    assert len(batch.readings) == 1
