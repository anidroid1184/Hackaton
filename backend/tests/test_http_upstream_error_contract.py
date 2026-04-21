"""Contrato de códigos HTTP aguas arriba (502/503/504) sin red: MockTransport.

Los errores de puerta de enlace no se forzan de forma estable contra el middleware real;
estos tests documentan que el cliente HTTP debe poder leer y clasificar esos códigos.
"""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.http_contract
@pytest.mark.parametrize(
    "status_code",
    [502, 503, 504],
    ids=["bad_gateway", "service_unavailable", "gateway_timeout"],
)
def test_client_surfaces_upstream_gateway_errors(status_code: int) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code,
            json={"detail": "upstream_or_provider_failure"},
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport, base_url="https://example.invalid") as client:
        response = client.get("/probe")

    assert response.status_code == status_code
    assert response.json()["detail"] == "upstream_or_provider_failure"
