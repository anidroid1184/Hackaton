"""Integración HTTP al middleware Tinku: genera snapshots JSON según manifest."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pytest

from tests.tinku.support import (
    coerce_env_numeric_ids,
    manifest_missing_required_env,
    substitute_env_strings,
)

_FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
_SNAP_ROOT = _FIXTURES / "tinku_snapshots"


def _build_url(base: str, provider: str, path: str) -> str:
    b = base.rstrip("/")
    p = path.lstrip("/")
    return f"{b}/{provider}/{p}"


def _write_skip_snapshot(out_path: Path, entry: dict[str, Any], reason: str, **extra: Any) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "_skipped": True,
        "_reason": reason,
        "manifest_id": entry.get("id"),
        **extra,
    }
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


@pytest.mark.tinku
def test_fetch_tinku_snapshot(
    tinku_manifest_entry: dict[str, Any],
    tinku_http_client: Any,
) -> None:
    api_key = os.environ.get("TINKU_API_KEY")
    if not api_key:
        pytest.skip("TINKU_API_KEY no definida (definir en entorno o .env en la raíz del repo)")

    entry = tinku_manifest_entry
    out_rel = str(entry["output_file"])
    out_path = _SNAP_ROOT / out_rel

    missing = manifest_missing_required_env(entry)
    if missing:
        _write_skip_snapshot(
            out_path,
            entry,
            "missing_env",
            missing_env=missing,
        )
        pytest.skip(f"manifest requiere variables de entorno: {', '.join(missing)}")

    method = str(entry.get("method", "GET")).upper()
    provider = str(entry["provider"])
    rel_path = str(entry["path"])
    expected = int(entry.get("expected_status", 200))

    base = os.environ.get("TINKU_BASE_URL", "https://techos.thetribu.dev")
    url = _build_url(base, provider, rel_path)

    headers: dict[str, str] = {"Authorization": api_key}
    body: Any = None
    params: dict[str, Any] | None = None

    if "body" in entry:
        body = coerce_env_numeric_ids(substitute_env_strings(entry["body"]))
        headers["Content-Type"] = "application/json"
    if entry.get("query"):
        params = coerce_env_numeric_ids(substitute_env_strings(entry["query"]))
        if isinstance(params, dict):
            bad = [k for k, v in params.items() if v is None]
            if bad:
                _write_skip_snapshot(
                    out_path,
                    entry,
                    "query_incompleta",
                    missing_query_keys=bad,
                )
                pytest.skip(f"query incompleta tras sustituir env: {', '.join(bad)}")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    response = tinku_http_client.request(method, url, headers=headers, json=body, params=params)

    if response.status_code == 404:
        text = response.text.lower()
        if "provider" in text and "not found" in text:
            _write_skip_snapshot(
                out_path,
                entry,
                "middleware_sin_proveedor",
                provider=provider,
                http_status=404,
                body_preview=response.text[:800],
            )
            return

    assert response.status_code == expected, (
        f"{entry.get('id')}: {response.status_code} {response.text[:500]}"
    )

    try:
        payload: Any = response.json()
    except (json.JSONDecodeError, ValueError):
        preview = response.content[:400].decode("utf-8", errors="replace")
        diag: dict[str, Any] = {
            "_skipped": True,
            "_reason": "cuerpo_no_json",
            "manifest_id": entry.get("id"),
            "http_status": response.status_code,
            "content_type": response.headers.get("content-type"),
            "preview_utf8_replace": preview,
        }
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(diag, f, ensure_ascii=False, indent=2)
        return

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
