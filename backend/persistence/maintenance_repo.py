"""Persistencia de mantenimientos para agenda y cierre."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

import httpx
from settings import Settings


class MaintenancePersistenceError(RuntimeError):
    """Error de persistencia de mantenimiento recuperable en router."""


class MaintenanceRepo(Protocol):
    async def fetch_schedule(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        client_id: str | None,
        organization_id: str | None,
    ) -> list[dict[str, Any]]: ...

    async def reschedule_maintenance(
        self,
        *,
        maintenance_id: str,
        next_scheduled_at: datetime,
        problem_summary: str | None,
        assigned_profile_id: str | None,
        organization_id: str | None,
    ) -> dict[str, Any] | None: ...

    async def cancel_maintenance(
        self,
        *,
        maintenance_id: str,
        reason: str | None,
        cancelled_at: datetime,
        organization_id: str | None,
    ) -> dict[str, Any] | None: ...

    async def complete_maintenance(
        self,
        *,
        maintenance_id: str,
        completed_at: datetime,
        notes: str | None,
        checklist: list[str] | None,
        evidence: list[str] | None,
        organization_id: str | None,
    ) -> dict[str, Any] | None: ...

    async def fetch_technician_visits(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        organization_id: str | None,
        assigned_profile_id: str | None,
    ) -> list[dict[str, Any]]: ...


class SupabaseMaintenanceRepo:
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
        return f"{base}/rest/v1/maintenances"

    def _zones_endpoint(self) -> str:
        base = self._settings.supabase_url.rstrip("/")
        return f"{base}/rest/v1/zones"

    def _headers(self, *, include_prefer: bool = False) -> dict[str, str]:
        key = self._settings.service_role_key
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        if include_prefer:
            headers["Prefer"] = "return=representation"
        return headers

    @staticmethod
    def _to_zulu(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")

    @staticmethod
    def _row_to_schedule(item: dict[str, Any], geozone: str) -> dict[str, Any] | None:
        plant = item.get("plants")
        if not isinstance(plant, dict):
            return None
        client = plant.get("clients")
        client_name = ""
        client_id = ""
        if isinstance(client, dict):
            raw_name = client.get("name")
            if isinstance(raw_name, str):
                client_name = raw_name
            raw_id = client.get("id")
            if isinstance(raw_id, str):
                client_id = raw_id
        plant_name = plant.get("name")
        if not isinstance(plant_name, str):
            plant_name = ""
        address_line = plant.get("address_line")
        if not isinstance(address_line, str):
            address_line = ""
        problem_summary = item.get("problem_summary")
        if not isinstance(problem_summary, str):
            problem_summary = ""

        status = item.get("status")
        if not isinstance(status, str):
            status = ""

        row_id = item.get("id")
        if not isinstance(row_id, str):
            return None

        completed_at = item.get("last_maintenance_at")
        if not isinstance(completed_at, str):
            completed_at = None

        due_at = item.get("next_scheduled_at")
        if not isinstance(due_at, str):
            due_at = None

        assigned_profile_id = item.get("assigned_profile_id")
        if not isinstance(assigned_profile_id, str):
            assigned_profile_id = None

        return {
            "id": row_id,
            "plant_name": plant_name,
            "client_name": client_name,
            "client_id": client_id,
            "address_line": address_line,
            "last_maintenance_at": completed_at,
            "next_scheduled_at": due_at,
            "problem_summary": problem_summary,
            "geozone": geozone,
            "status": status,
            "suggested_technician_id": assigned_profile_id,
        }

    @staticmethod
    def _priority_from_due_at(next_scheduled_at: datetime | None) -> str:
        if next_scheduled_at is None:
            return "media"
        delta_seconds = (next_scheduled_at - datetime.now(tz=UTC)).total_seconds()
        if delta_seconds <= 24 * 3600:
            return "alta"
        if delta_seconds <= 72 * 3600:
            return "media"
        return "baja"

    @staticmethod
    def _window_from_due_at(next_scheduled_at: datetime | None) -> str:
        if next_scheduled_at is None:
            return ""
        start = next_scheduled_at.astimezone(UTC)
        end = start + timedelta(hours=2)
        return f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"

    async def fetch_schedule(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        client_id: str | None,
        organization_id: str | None,
    ) -> list[dict[str, Any]]:
        if not self._settings.supabase_url or not self._settings.service_role_key:
            raise MaintenancePersistenceError("Missing Supabase persistence settings")

        params: dict[str, str] = {
            "select": "id,status,last_maintenance_at,next_scheduled_at,problem_summary,assigned_profile_id,plants!inner(name,address_line,zone_id,clients!inner(id,name,organization_id))",
            "order": "next_scheduled_at.asc.nullslast",
        }
        if window_from is not None:
            params["next_scheduled_at"] = f"gte.{window_from.isoformat()}"
        if window_to is not None:
            existing = params.get("and")
            segment = f"next_scheduled_at.lte.{window_to.isoformat()}"
            params["and"] = segment if not existing else f"{existing},{segment}"
        if organization_id:
            params["plants.clients.organization_id"] = f"eq.{organization_id}"
        if client_id:
            params["plants.client_id"] = f"eq.{client_id}"

        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise MaintenancePersistenceError("Error calling Supabase maintenances endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise MaintenancePersistenceError(
                f"Supabase maintenances query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise MaintenancePersistenceError("Invalid response payload from Supabase maintenances")

        zone_ids: set[str] = set()
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            if not isinstance(plant, dict):
                continue
            zone_id = plant.get("zone_id")
            if isinstance(zone_id, str) and zone_id:
                zone_ids.add(zone_id)
        zones_map = await self._fetch_zones_map(zone_ids)

        rows: list[dict[str, Any]] = []
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            zone_label = ""
            if isinstance(plant, dict):
                zone_id = plant.get("zone_id")
                if isinstance(zone_id, str):
                    zone_label = zones_map.get(zone_id, "")
            mapped = self._row_to_schedule(item, zone_label)
            if mapped is None:
                continue
            if geozone and mapped.get("geozone") != geozone:
                continue
            rows.append(mapped)
        return rows

    async def fetch_technician_visits(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        organization_id: str | None,
        assigned_profile_id: str | None,
    ) -> list[dict[str, Any]]:
        if not self._settings.supabase_url or not self._settings.service_role_key:
            raise MaintenancePersistenceError("Missing Supabase persistence settings")

        params: dict[str, str] = {
            "select": (
                "id,maintenance_ticket_id,next_scheduled_at,problem_summary,status,"
                "assigned_profile_id,plants!inner(name,address_line,zone_id,clients!inner(organization_id))"
            ),
            "status": "eq.scheduled",
            "order": "next_scheduled_at.asc.nullslast",
        }
        if window_from is not None:
            params["next_scheduled_at"] = f"gte.{window_from.isoformat()}"
        if window_to is not None:
            params["and"] = f"next_scheduled_at.lte.{window_to.isoformat()}"
        if organization_id:
            params["plants.clients.organization_id"] = f"eq.{organization_id}"
        if assigned_profile_id:
            params["assigned_profile_id"] = f"eq.{assigned_profile_id}"

        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise MaintenancePersistenceError("Error calling Supabase maintenances endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise MaintenancePersistenceError(
                f"Supabase maintenances query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise MaintenancePersistenceError("Invalid response payload from Supabase maintenances")

        zone_ids: set[str] = set()
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            if not isinstance(plant, dict):
                continue
            zone_id = plant.get("zone_id")
            if isinstance(zone_id, str) and zone_id:
                zone_ids.add(zone_id)
        zones_map = await self._fetch_zones_map(zone_ids)

        rows: list[dict[str, Any]] = []
        for item in body:
            if not isinstance(item, dict):
                continue
            plant = item.get("plants")
            if not isinstance(plant, dict):
                continue
            zone_label = ""
            zone_id = plant.get("zone_id")
            if isinstance(zone_id, str):
                zone_label = zones_map.get(zone_id, "")
            if geozone and zone_label != geozone:
                continue
            plant_name = plant.get("name")
            if not isinstance(plant_name, str):
                continue
            address = plant.get("address_line")
            if not isinstance(address, str):
                address = ""

            maintenance_id = item.get("id")
            if not isinstance(maintenance_id, str):
                continue
            ticket_id = item.get("maintenance_ticket_id")
            if not isinstance(ticket_id, str) or not ticket_id:
                ticket_id = maintenance_id

            summary = item.get("problem_summary")
            if not isinstance(summary, str):
                summary = ""
            next_scheduled_at = item.get("next_scheduled_at")
            due_at: datetime | None = None
            if isinstance(next_scheduled_at, str):
                try:
                    due_at = datetime.fromisoformat(next_scheduled_at.replace("Z", "+00:00"))
                except ValueError:
                    due_at = None
            rows.append(
                {
                    "id": maintenance_id,
                    "plant": plant_name,
                    "address": address,
                    "geozone": zone_label,
                    "window": self._window_from_due_at(due_at),
                    "ticketId": ticket_id,
                    "problemSummary": summary,
                    "priority": self._priority_from_due_at(due_at),
                }
            )
        return rows

    async def _is_authorized_for_org(self, maintenance_id: str, organization_id: str) -> bool:
        params = {
            "select": "id,plants!inner(clients!inner(organization_id))",
            "id": f"eq.{maintenance_id}",
            "plants.clients.organization_id": f"eq.{organization_id}",
            "limit": "1",
        }
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise MaintenancePersistenceError("Error checking maintenance organization access") from exc
        finally:
            if owns_client:
                await client.aclose()
        if response.status_code >= 400:
            raise MaintenancePersistenceError(
                f"Supabase maintenance authorization check failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise MaintenancePersistenceError("Invalid response in maintenance authorization check")
        return len(body) > 0

    async def complete_maintenance(
        self,
        *,
        maintenance_id: str,
        completed_at: datetime,
        notes: str | None,
        checklist: list[str] | None,
        evidence: list[str] | None,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        patch_payload: dict[str, Any] = {
            "status": "completed",
            "completed_at": completed_at.isoformat(),
        }
        if notes:
            patch_payload["notes"] = notes
        if checklist:
            patch_payload["checklist"] = checklist
        if evidence:
            patch_payload["evidence"] = evidence

        row = await self._patch_maintenance(
            maintenance_id=maintenance_id,
            patch_payload=patch_payload,
            fallback_patch_payload={
                "status": "completed",
                "completed_at": completed_at.isoformat(),
            },
            select_fields="id,status,completed_at,notes,checklist,evidence",
            organization_id=organization_id,
        )
        if row is None:
            return None
        row_id = row.get("id")
        if not isinstance(row_id, str):
            return None
        raw_completed_at = row.get("completed_at")
        completed = self._to_zulu(completed_at)
        if isinstance(raw_completed_at, str):
            try:
                completed = self._to_zulu(datetime.fromisoformat(raw_completed_at.replace("Z", "+00:00")))
            except ValueError:
                completed = self._to_zulu(completed_at)
        result: dict[str, Any] = {
            "maintenance_id": row_id,
            "status": "completed",
            "completed_at": completed,
        }
        row_notes = row.get("notes")
        if isinstance(row_notes, str):
            result["notes"] = row_notes
        row_checklist = row.get("checklist")
        if isinstance(row_checklist, list):
            result["checklist"] = [str(item) for item in row_checklist]
        row_evidence = row.get("evidence")
        if isinstance(row_evidence, list):
            result["evidence"] = [str(item) for item in row_evidence]
        return result

    async def reschedule_maintenance(
        self,
        *,
        maintenance_id: str,
        next_scheduled_at: datetime,
        problem_summary: str | None,
        assigned_profile_id: str | None,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        patch_payload: dict[str, Any] = {
            "status": "scheduled",
            "next_scheduled_at": next_scheduled_at.isoformat(),
        }
        if problem_summary is not None:
            patch_payload["problem_summary"] = problem_summary
        if assigned_profile_id is not None:
            patch_payload["assigned_profile_id"] = assigned_profile_id

        row = await self._patch_maintenance(
            maintenance_id=maintenance_id,
            patch_payload=patch_payload,
            fallback_patch_payload=patch_payload,
            select_fields="id,status,next_scheduled_at,problem_summary,assigned_profile_id",
            organization_id=organization_id,
        )
        if row is None:
            return None
        row_id = row.get("id")
        if not isinstance(row_id, str):
            return None
        raw_next = row.get("next_scheduled_at")
        next_at = self._to_zulu(next_scheduled_at)
        if isinstance(raw_next, str):
            try:
                next_at = self._to_zulu(datetime.fromisoformat(raw_next.replace("Z", "+00:00")))
            except ValueError:
                next_at = self._to_zulu(next_scheduled_at)
        assigned = row.get("assigned_profile_id")
        if not isinstance(assigned, str):
            assigned = None
        summary = row.get("problem_summary")
        if not isinstance(summary, str):
            summary = problem_summary or ""
        return {
            "maintenance_id": row_id,
            "status": "scheduled",
            "next_scheduled_at": next_at,
            "problem_summary": summary,
            "assigned_profile_id": assigned,
        }

    async def cancel_maintenance(
        self,
        *,
        maintenance_id: str,
        reason: str | None,
        cancelled_at: datetime,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        patch_payload: dict[str, Any] = {
            "status": "cancelled",
            "cancelled_at": cancelled_at.isoformat(),
        }
        if reason:
            patch_payload["cancellation_reason"] = reason
        fallback_payload = {"status": "cancelled"}
        row = await self._patch_maintenance(
            maintenance_id=maintenance_id,
            patch_payload=patch_payload,
            fallback_patch_payload=fallback_payload,
            select_fields="id,status,cancelled_at,cancellation_reason",
            organization_id=organization_id,
        )
        if row is None:
            return None
        row_id = row.get("id")
        if not isinstance(row_id, str):
            return None
        result: dict[str, Any] = {
            "maintenance_id": row_id,
            "status": "cancelled",
            "cancelled_at": self._to_zulu(cancelled_at),
        }
        row_cancelled = row.get("cancelled_at")
        if isinstance(row_cancelled, str):
            try:
                parsed = datetime.fromisoformat(row_cancelled.replace("Z", "+00:00"))
                result["cancelled_at"] = self._to_zulu(parsed)
            except ValueError:
                result["cancelled_at"] = self._to_zulu(cancelled_at)
        row_reason = row.get("cancellation_reason")
        if isinstance(row_reason, str):
            result["reason"] = row_reason
        elif reason:
            result["reason"] = reason
        return result

    async def _patch_maintenance(
        self,
        *,
        maintenance_id: str,
        patch_payload: dict[str, Any],
        fallback_patch_payload: dict[str, Any],
        select_fields: str,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        if not self._settings.supabase_url or not self._settings.service_role_key:
            raise MaintenancePersistenceError("Missing Supabase persistence settings")
        if organization_id and not await self._is_authorized_for_org(maintenance_id, organization_id):
            return None
        params = {
            "id": f"eq.{maintenance_id}",
            "select": select_fields,
            "limit": "1",
        }
        body = await self._patch_maintenances_endpoint(
            params=params,
            payload=patch_payload,
        )
        if body is None and patch_payload != fallback_patch_payload:
            body = await self._patch_maintenances_endpoint(
                params=params,
                payload=fallback_patch_payload,
            )
        if body is None:
            raise MaintenancePersistenceError("Invalid response payload from maintenance update")
        if not body:
            return None
        first = body[0]
        if not isinstance(first, dict):
            return None
        return first

    async def _patch_maintenances_endpoint(
        self,
        *,
        params: dict[str, str],
        payload: dict[str, Any],
    ) -> list[dict[str, Any]] | None:
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.patch(
                self._endpoint(),
                params=params,
                headers=self._headers(include_prefer=True),
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise MaintenancePersistenceError("Error updating maintenance status in Supabase") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            if response.status_code == 400:
                return None
            raise MaintenancePersistenceError(
                f"Supabase maintenance update failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            return None
        out: list[dict[str, Any]] = []
        for row in body:
            if isinstance(row, dict):
                out.append(row)
        return out

    async def _fetch_zones_map(self, zone_ids: set[str]) -> dict[str, str]:
        if not zone_ids:
            return {}
        params = {
            "select": "id,geozone,name",
            "id": f"in.({','.join(sorted(zone_ids))})",
        }
        client = self._build_client()
        owns_client = self._client is None
        try:
            response = await client.get(self._zones_endpoint(), params=params, headers=self._headers())
        except httpx.HTTPError as exc:
            raise MaintenancePersistenceError("Error calling Supabase zones endpoint") from exc
        finally:
            if owns_client:
                await client.aclose()
        if response.status_code >= 400:
            raise MaintenancePersistenceError(
                f"Supabase zones query failed with status {response.status_code}"
            )
        body = response.json()
        if not isinstance(body, list):
            raise MaintenancePersistenceError("Invalid response payload from Supabase zones")
        out: dict[str, str] = {}
        for item in body:
            if not isinstance(item, dict):
                continue
            row_id = item.get("id")
            if not isinstance(row_id, str):
                continue
            geozone = item.get("geozone")
            if isinstance(geozone, str) and geozone:
                out[row_id] = geozone
                continue
            name = item.get("name")
            if isinstance(name, str) and name:
                out[row_id] = name
        return out
