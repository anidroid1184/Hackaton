"""Errores HTTP esperados contra el middleware Tinku (red real). Marca ``tinku``.

Alineado con la tabla «Errores comunes de autenticación» y buenas prácticas en
``docs/resources/technical_guide.md`` (secciones 4 y 10).
"""

from __future__ import annotations

import os
from typing import Any

import pytest

_DEFAULT_BASE = "https://techos.thetribu.dev"


def _base_url() -> str:
    return os.environ.get("TINKU_BASE_URL", _DEFAULT_BASE).rstrip("/")


@pytest.mark.tinku
def test_401_when_authorization_header_missing(tinku_http_client: Any) -> None:
    """Sin ``Authorization``, el middleware debe rechazar la petición (401 o 403 según implementación)."""
    url = f"{_base_url()}/deye/v1.0/station/list"
    response = tinku_http_client.post(
        url,
        headers={"Content-Type": "application/json"},
        json={"page": 1, "size": 1},
        timeout=30.0,
    )
    assert response.status_code in (401, 403), (
        f"se esperaba 401 o 403 sin API key, obtuvo {response.status_code}: {response.text[:400]}"
    )


@pytest.mark.tinku
def test_401_when_api_key_invalid(tinku_http_client: Any) -> None:
    """API key inválida: no usar nunca una key real; valor fijo solo para contrato HTTP."""
    url = f"{_base_url()}/deye/v1.0/station/list"
    response = tinku_http_client.post(
        url,
        headers={
            "Authorization": "tk_invalid_key_pytest_contract_only",
            "Content-Type": "application/json",
        },
        json={"page": 1, "size": 1},
        timeout=30.0,
    )
    assert response.status_code in (401, 403), (
        f"se esperaba 401 o 403 con key inválida, obtuvo {response.status_code}: {response.text[:400]}"
    )


@pytest.mark.tinku
def test_rejects_non_json_body_when_json_expected(tinku_http_client: Any) -> None:
    """Payloads mal formados: la guía (sección 10) cita errores 400/500 del proveedor; aquí cuerpo no JSON."""
    api_key = os.environ.get("TINKU_API_KEY")
    if not api_key:
        pytest.skip(
            "TINKU_API_KEY no definida: no se puede contrastar auth válida + cuerpo inválido"
        )

    url = f"{_base_url()}/deye/v1.0/station/list"
    response = tinku_http_client.post(
        url,
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
        },
        content=b"{not valid json",
        timeout=30.0,
    )
    assert response.status_code >= 400, (
        f"se esperaba error con cuerpo mal formado, obtuvo {response.status_code}"
    )


@pytest.mark.tinku
def test_404_when_provider_slug_does_not_exist(tinku_http_client: Any) -> None:
    """Slug de proveedor inexistente → ``404`` (guía técnica, sección 4)."""
    api_key = os.environ.get("TINKU_API_KEY")
    if not api_key:
        pytest.skip("TINKU_API_KEY no definida")

    url = f"{_base_url()}/_pytest_slug_inexistente_/v1/ping"
    response = tinku_http_client.get(
        url,
        headers={"Authorization": api_key},
        timeout=30.0,
    )
    assert response.status_code == 404, (
        f"se esperaba 404 por slug desconocido, obtuvo {response.status_code}: {response.text[:400]}"
    )


@pytest.mark.parametrize(
    ("method", "path", "label"),
    [
        (
            "POST",
            "/growatt/v1/plant/list",
            "growatt solo GET; POST debe ser 405",
        ),
        (
            "DELETE",
            "/deye/v1.0/station/list",
            "DELETE no permitido en ruta Deye; 405",
        ),
    ],
)
@pytest.mark.tinku
def test_405_when_http_method_not_allowed(
    tinku_http_client: Any,
    method: str,
    path: str,
    label: str,
) -> None:
    """Método HTTP no permitido → ``405`` (guía técnica, sección 4)."""
    api_key = os.environ.get("TINKU_API_KEY")
    if not api_key:
        pytest.skip("TINKU_API_KEY no definida")

    url = f"{_base_url()}{path}"
    response = tinku_http_client.request(
        method,
        url,
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
        },
        json={} if method in ("POST", "PUT", "PATCH") else None,
        timeout=30.0,
    )
    assert response.status_code == 405, (
        f"{label}: esperado 405, obtuvo {response.status_code}: {response.text[:400]}"
    )
