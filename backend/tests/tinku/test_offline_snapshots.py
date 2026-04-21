"""Consumo offline de snapshots generados (sin red)."""

from __future__ import annotations

import pytest


@pytest.mark.offline
def test_tinku_snapshots_fixture_loads_when_present(
    tinku_snapshots_by_id: dict[str, object],
) -> None:
    if not tinku_snapshots_by_id:
        pytest.skip(
            "No hay JSON en tests/fixtures/tinku_snapshots/. "
            "Generar con: cd backend && TINKU_API_KEY=tk_... uv run pytest --tinku"
        )
    assert isinstance(tinku_snapshots_by_id, dict)
    for key in tinku_snapshots_by_id:
        assert isinstance(key, str)
