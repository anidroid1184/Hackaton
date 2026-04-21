"""Unit: normalize_batch convierte RawReading -> CanonicalReading."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest
from domain.inference import normalize_batch
from domain.magnitudes import Canonical
from schemas.ingest import RawReading

_TS = datetime(2026, 4, 18, 12, 0, 0, tzinfo=UTC)
_PLANT = UUID("11111111-1111-1111-1111-111111111111")


@pytest.mark.unit
def test_batch_all_valid_returns_canonicals_and_zero_rejected() -> None:
    readings = [
        RawReading(
            ts=_TS,
            device_id="2402010117",
            values={"Pac": 3500.0, "GridFrequency": 60.02, "SOC": 80.0},
        ),
    ]

    canonicals, rejected = normalize_batch(readings, plant_id=_PLANT)

    assert rejected == 0
    assert len(canonicals) == 1
    row = canonicals[0]
    assert row["plant_id"] == str(_PLANT)
    assert row["device_id"] == "2402010117"
    assert row["ts"] == _TS.isoformat()
    assert row["canonical"] == {
        Canonical.P_ACTIVE_KW.value: 3.5,
        Canonical.FREQ_HZ.value: 60.02,
        Canonical.SOC_PCT.value: 80.0,
    }


@pytest.mark.unit
def test_batch_mixed_valid_invalid_counts_rejected_entries() -> None:
    readings = [
        RawReading(
            ts=_TS,
            values={"Pac": 3500.0, "weirdKey": "non-numeric"},
        ),
    ]

    canonicals, rejected = normalize_batch(readings, plant_id=None)

    assert len(canonicals) == 1
    assert rejected == 1
    assert canonicals[0]["canonical"] == {Canonical.P_ACTIVE_KW.value: 3.5}


@pytest.mark.unit
def test_batch_preserves_raw_values_for_audit() -> None:
    raw_values = {"Pac": 3500.0, "unknown": 42.0}
    readings = [RawReading(ts=_TS, values=raw_values)]

    canonicals, _ = normalize_batch(readings, plant_id=_PLANT)

    assert canonicals[0]["raw"] == raw_values


@pytest.mark.unit
def test_batch_reading_with_no_inferable_values_is_row_with_empty_canonical() -> None:
    readings = [RawReading(ts=_TS, values={"foo": "bar"})]

    canonicals, rejected = normalize_batch(readings, plant_id=None)

    assert len(canonicals) == 1
    assert canonicals[0]["canonical"] == {}
    assert rejected == 1


@pytest.mark.unit
def test_batch_plant_id_none_is_serialized_as_none() -> None:
    readings = [RawReading(ts=_TS, values={"Pac": 1000.0})]

    canonicals, _ = normalize_batch(readings, plant_id=None)

    assert canonicals[0]["plant_id"] is None
