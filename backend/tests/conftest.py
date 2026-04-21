"""Configuración pytest: entorno, flag `--tinku`, fixtures de snapshots."""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml
from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(_REPO_ROOT / ".env")


def load_tinku_manifest() -> dict[str, Any]:
    path = _BACKEND_ROOT / "tests" / "fixtures" / "tinku_endpoints.yaml"
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="session")
def tinku_manifest_path() -> Path:
    return _BACKEND_ROOT / "tests" / "fixtures" / "tinku_endpoints.yaml"


@pytest.fixture(scope="session")
def tinku_snapshots_by_id(tinku_manifest_path: Path) -> dict[str, Any]:
    """Carga JSON existentes indexados por ``id`` del manifest (para tests offline)."""
    with tinku_manifest_path.open(encoding="utf-8") as f:
        manifest = yaml.safe_load(f)
    root = tinku_manifest_path.parent / "tinku_snapshots"
    out: dict[str, Any] = {}
    for entry in manifest.get("entries", []):
        eid = entry.get("id")
        rel = entry.get("output_file")
        if not eid or not rel:
            continue
        path = root / rel
        if path.is_file():
            with path.open(encoding="utf-8") as fp:
                out[str(eid)] = json.load(fp)
    return out


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--tinku",
        action="store_true",
        default=False,
        help="Ejecutar solo tests marcados @pytest.mark.tinku (integración middleware).",
    )


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers", "tinku: integración HTTP al middleware Tinku (techos.thetribu.dev)"
    )
    config.addinivalue_line("markers", "offline: lectura de snapshots locales sin red")
    config.addinivalue_line(
        "markers",
        "http_contract: contrato de códigos HTTP aguas arriba sin red (p. ej. MockTransport 502/503/504)",
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    tinku_only = config.getoption("--tinku")
    selected: list[pytest.Item] = []
    for item in items:
        has_tinku = item.get_closest_marker("tinku") is not None
        has_http_contract = item.get_closest_marker("http_contract") is not None
        if tinku_only:
            if has_tinku or has_http_contract:
                selected.append(item)
            continue
        if has_tinku:
            continue
        selected.append(item)
    items[:] = selected


def pytest_generate_tests(metafunc: pytest.Metafunc) -> None:
    if "tinku_manifest_entry" not in metafunc.fixturenames:
        return
    data = load_tinku_manifest()
    entries = data.get("entries", [])
    metafunc.parametrize(
        "tinku_manifest_entry",
        entries,
        ids=[str(e.get("id", f"idx-{i}")) for i, e in enumerate(entries)],
    )


@pytest.fixture
def tinku_http_client() -> Iterator[Any]:
    import httpx

    with httpx.Client(timeout=30.0) as client:
        yield client
