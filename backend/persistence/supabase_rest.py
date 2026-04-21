"""Repositorio de `readings` sobre PostgREST de Supabase.

Reglas (docs/ARCHITECTURE.md):
  - La `service_role` key es server-only; nunca viaja al browser.
  - El header `Prefer: return=minimal` evita traer el INSERT de vuelta.
  - El RLS del browser no se duplica aqui: este repo escribe en nombre del servidor.
"""

from __future__ import annotations

from typing import Any, Protocol

import httpx
from domain.inference import CanonicalReading
from settings import Settings


class ReadingsRepo(Protocol):
    """Contrato minimo del repositorio de lecturas."""

    async def insert_readings(self, rows: list[CanonicalReading]) -> None: ...


class SupabasePersistenceError(RuntimeError):
    """Error al persistir en PostgREST (4xx/5xx upstream)."""

    def __init__(self, status_code: int, body: str) -> None:
        super().__init__(f"supabase postgrest error {status_code}: {body[:200]}")
        self.status_code = status_code
        self.body = body


class SupabaseReadingsRepo:
    """Cliente httpx contra `{SUPABASE_URL}/rest/v1/readings`."""

    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    def _build_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=httpx.Timeout(10.0))

    def _endpoint(self) -> str:
        base = self._settings.supabase_url.rstrip("/")
        return f"{base}/rest/v1/readings"

    def _headers(self) -> dict[str, str]:
        key = self._settings.service_role_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    async def insert_readings(self, rows: list[CanonicalReading]) -> None:
        if not rows:
            return
        payload: list[dict[str, Any]] = [dict(r) for r in rows]
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.post(
                self._endpoint(),
                json=payload,
                headers=self._headers(),
            )
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise SupabasePersistenceError(response.status_code, response.text)


class FakeReadingsRepo:
    """Repositorio en memoria para tests (no toca red)."""

    def __init__(self) -> None:
        self.rows: list[CanonicalReading] = []

    async def insert_readings(self, rows: list[CanonicalReading]) -> None:
        self.rows.extend(rows)
