"""Tests unitarios de utilidades manifest Tinku."""

from __future__ import annotations

import pytest

from tests.tinku.support import (
    coerce_env_numeric_ids,
    manifest_missing_required_env,
    substitute_env_strings,
)


def test_substitute_env_strings_replaces_placeholder(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TINKU_TEST_VAR", "abc")
    assert substitute_env_strings("${TINKU_TEST_VAR}") == "abc"


def test_substitute_env_strings_nested_dict(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TINKU_A", "1")
    out = substitute_env_strings({"x": "${TINKU_A}", "y": [2]})
    assert out == {"x": "1", "y": [2]}


def test_coerce_env_numeric_ids_station_id() -> None:
    assert coerce_env_numeric_ids({"stationId": "40760", "name": "x"}) == {
        "stationId": 40760,
        "name": "x",
    }


def test_coerce_env_numeric_ids_plant_id() -> None:
    assert coerce_env_numeric_ids({"plant_id": "1356131"}) == {"plant_id": 1356131}


def test_manifest_missing_required_env_lists_only_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TINKU_MISSING", raising=False)
    monkeypatch.setenv("TINKU_SET", "1")
    entry = {"requires_env": ["TINKU_MISSING", "TINKU_SET"]}
    assert manifest_missing_required_env(entry) == ["TINKU_MISSING"]
