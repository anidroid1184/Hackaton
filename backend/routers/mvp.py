"""Router MVP para alinear vistas frontend con backend normalizado."""

from __future__ import annotations

import csv
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from io import StringIO
from typing import Annotated, Any

from cache.store import FAULTS_BY_ZONE_CACHE_PREFIX, build_cache_key, safe_cached_async
from domain.mvp_data import (
    ALERTS,
    CORPORATE_KPIS,
    CORPORATE_OVERVIEW,
    CORPORATE_ROI,
    CORPORATE_TICKETS,
    FAULTS_BY_ZONE,
    FLEET_PLANTS,
    MAINTENANCE_SCHEDULE,
    TECHNICIAN_PREVENTIVE_TASKS,
    TECHNICIAN_TELEMETRY,
    TECHNICIAN_VISITS,
    TECHNICIANS,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from jwt_auth import get_current_claims, get_settings
from persistence.analytics_repo import (
    AnalyticsPersistenceError,
    FaultsByZoneRepo,
    SupabaseFaultsByZoneRepo,
)
from persistence.maintenance_repo import (
    MaintenancePersistenceError,
    MaintenanceRepo,
    SupabaseMaintenanceRepo,
)
from settings import Settings

router = APIRouter(tags=["mvp"])
_FAULTS_BY_ZONE_CACHE_TTL_SECONDS = 30.0
_OPERATIONS_ROLES = frozenset({"admin", "technician"})
_CORPORATE_ROLES = frozenset({"admin", "client"})
_TECHNICIAN_ROLES = frozenset({"admin", "technician"})


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _to_zulu(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _scope_has_app(claims: dict[str, Any]) -> bool:
    raw_scope = claims.get("scope")
    scopes: list[str] = []
    if isinstance(raw_scope, str):
        scopes.extend(raw_scope.split())
    elif isinstance(raw_scope, list):
        scopes.extend(str(item) for item in raw_scope)
    app_meta = claims.get("app_metadata")
    if isinstance(app_meta, dict):
        nested_scope = app_meta.get("scope")
        if isinstance(nested_scope, str):
            scopes.extend(nested_scope.split())
        elif isinstance(nested_scope, list):
            scopes.extend(str(item) for item in nested_scope)
    return "app" in {item.strip() for item in scopes if item.strip()}


def _resolve_organization_id(
    claims: dict[str, Any],
    requested_organization_id: str | None,
) -> str | None:
    resolved: str | None = None
    app_metadata = claims.get("app_metadata")
    app_scope = _scope_has_app(claims)
    app_payload: dict[str, Any] = {}
    if isinstance(app_metadata, dict):
        nested_app = app_metadata.get("app")
        if isinstance(nested_app, dict):
            app_payload = nested_app

    app_candidates = (
        app_payload.get("organization_id"),
        app_payload.get("organizationId"),
        app_payload.get("org_id"),
        app_metadata.get("organization_id") if isinstance(app_metadata, dict) else None,
    )
    for candidate in app_candidates:
        if isinstance(candidate, str) and candidate:
            resolved = candidate
            break
    if resolved is None and not app_scope:
        # Compatibilidad con tokens previos sin `scope=app`.
        generic_candidates = (
            claims.get("organization_id"),
            claims.get("organizationId"),
            claims.get("org_id"),
        )
        for candidate in generic_candidates:
            if isinstance(candidate, str) and candidate:
                resolved = candidate
                break
    if resolved is None:
        user_metadata = claims.get("user_metadata")
        if isinstance(user_metadata, dict):
            for key in ("organization_id", "organizationId", "org_id"):
                candidate = user_metadata.get(key)
                if isinstance(candidate, str) and candidate:
                    resolved = candidate
                    break

    if requested_organization_id and resolved and requested_organization_id != resolved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization scope mismatch",
        )
    return requested_organization_id or resolved


def _resolve_role(claims: dict[str, Any]) -> str | None:
    raw_role = claims.get("role")
    if isinstance(raw_role, str) and raw_role:
        return raw_role
    app_metadata = claims.get("app_metadata")
    if isinstance(app_metadata, dict):
        nested_app = app_metadata.get("app")
        if isinstance(nested_app, dict):
            app_role = nested_app.get("role")
            if isinstance(app_role, str) and app_role:
                return app_role
        app_role = app_metadata.get("role")
        if isinstance(app_role, str) and app_role:
            return app_role
    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict):
        user_role = user_metadata.get("role")
        if isinstance(user_role, str) and user_role:
            return user_role
    return None


def _resolve_profile_id(claims: dict[str, Any]) -> str | None:
    app_metadata = claims.get("app_metadata")
    if isinstance(app_metadata, dict):
        nested_app = app_metadata.get("app")
        if isinstance(nested_app, dict):
            for key in ("profile_id", "profileId"):
                candidate = nested_app.get(key)
                if isinstance(candidate, str) and candidate:
                    return candidate
        for key in ("profile_id", "profileId"):
            candidate = app_metadata.get(key)
            if isinstance(candidate, str) and candidate:
                return candidate
    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict):
        for key in ("profile_id", "profileId"):
            candidate = user_metadata.get(key)
            if isinstance(candidate, str) and candidate:
                return candidate
    sub = claims.get("sub")
    if isinstance(sub, str) and sub:
        return sub
    return None


def _enforce_role(claims: dict[str, Any], allowed_roles: frozenset[str]) -> None:
    role = _resolve_role(claims)
    if role is None:
        return
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not allowed for this endpoint",
        )


def get_faults_by_zone_repo(
    settings: Annotated[Settings, Depends(get_settings)],
) -> FaultsByZoneRepo:
    return SupabaseFaultsByZoneRepo(settings=settings)


def get_maintenance_repo(
    settings: Annotated[Settings, Depends(get_settings)],
) -> MaintenanceRepo:
    return SupabaseMaintenanceRepo(settings=settings)


def _build_faults_by_zone_payload(from_: datetime | None, to: datetime | None) -> dict[str, Any]:
    payload = deepcopy(FAULTS_BY_ZONE)
    window = payload.get("window")
    if isinstance(window, dict):
        if from_ is not None:
            window["from"] = _to_zulu(from_)
        if to is not None:
            window["to"] = _to_zulu(to)
    return payload


def _war_room_alerts() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in ALERTS:
        payload = item.get("payload")
        if not isinstance(payload, dict):
            continue
        out.append(
            {
                "id": item["id"],
                "type": item["type"],
                "severity": item["severity"],
                "ts": item["ts"],
                "plantId": item["plant_id"],
                "plantName": payload.get("plantName"),
                "geozone": payload.get("geozone"),
                "summary": payload.get("summary"),
                "suggestedTechnicianName": payload.get("suggestedTechnicianName"),
            }
        )
    order = {"critical": 3, "warn": 2, "info": 1}
    return sorted(
        out,
        key=lambda row: (
            order.get(str(row.get("severity")), 0),
            str(row.get("ts", "")),
        ),
        reverse=True,
    )


def _normalize_optional_str(value: Any, *, field_name: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must be a string")
    stripped = value.strip()
    return stripped or None


def _normalize_optional_str_list(value: Any, *, field_name: str) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must be a list")
    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must contain only strings",
            )
        stripped = item.strip()
        if stripped:
            normalized.append(stripped)
    return normalized or None


def _build_schedule_csv(rows: list[dict[str, Any]]) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "plant_name",
            "client_name",
            "client_id",
            "address_line",
            "last_maintenance_at",
            "next_scheduled_at",
            "problem_summary",
            "geozone",
            "status",
            "suggested_technician_id",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.get("id", ""),
                row.get("plant_name", ""),
                row.get("client_name", ""),
                row.get("client_id", ""),
                row.get("address_line", ""),
                row.get("last_maintenance_at", ""),
                row.get("next_scheduled_at", ""),
                row.get("problem_summary", ""),
                row.get("geozone", ""),
                row.get("status", ""),
                row.get("suggested_technician_id", ""),
            ]
        )
    return buffer.getvalue()


def _build_faults_by_zone_csv(payload: dict[str, Any]) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["geozone", "fault_count", "normalized_rate", "fault_types"])
    buckets = payload.get("buckets")
    if isinstance(buckets, list):
        for bucket in buckets:
            if not isinstance(bucket, dict):
                continue
            fault_types_value = ""
            raw_fault_types = bucket.get("fault_types")
            if isinstance(raw_fault_types, list):
                serialized: list[str] = []
                for item in raw_fault_types:
                    if not isinstance(item, dict):
                        continue
                    fault_type = str(item.get("type", "")).strip()
                    count = item.get("count", 0)
                    if fault_type:
                        serialized.append(f"{fault_type}:{int(count)}")
                fault_types_value = "|".join(serialized)
            writer.writerow(
                [
                    bucket.get("geozone", ""),
                    bucket.get("fault_count", 0),
                    bucket.get("normalized_rate", 0),
                    fault_types_value,
                ]
            )
    return buffer.getvalue()


async def _fetch_faults_by_zone_payload(
    *,
    claims: dict[str, Any],
    repo: FaultsByZoneRepo,
    response: Response | None,
    from_: datetime | None,
    to: datetime | None,
    organization_id: str | None,
    client_id: str | None,
    geozone: str | None,
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    cache_key = build_cache_key(
        FAULTS_BY_ZONE_CACHE_PREFIX,
        {
            "from": _to_zulu(from_),
            "to": _to_zulu(to),
            "organization_id": resolved_org_id,
            "client_id": client_id,
            "geozone": geozone,
        },
    )

    async def _loader() -> dict[str, Any]:
        window_to = to or datetime.now(tz=UTC)
        window_from = from_ or datetime(1970, 1, 1, tzinfo=UTC)
        if window_from > window_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="'from' must be less than or equal to 'to'",
            )
        try:
            return await repo.fetch_faults_by_zone(
                window_from=window_from,
                window_to=window_to,
                organization_id=resolved_org_id,
                client_id=client_id,
                geozone=geozone,
            )
        except HTTPException:
            raise
        except AnalyticsPersistenceError:
            fallback = _build_faults_by_zone_payload(from_, to)
            if geozone:
                fallback["buckets"] = [
                    item
                    for item in fallback.get("buckets", [])
                    if isinstance(item, dict) and item.get("geozone") == geozone
                ]
            return fallback

    payload, is_hit = await safe_cached_async(
        key=cache_key,
        ttl_seconds=_FAULTS_BY_ZONE_CACHE_TTL_SECONDS,
        loader=_loader,
    )
    if response is not None:
        response.headers["X-Cache"] = "HIT" if is_hit else "MISS"
    return payload


async def _fetch_schedule_rows(
    *,
    claims: dict[str, Any],
    repo: MaintenanceRepo,
    from_: datetime | None,
    to: datetime | None,
    geozone: str | None,
    client_id: str | None,
    organization_id: str | None,
) -> list[dict[str, Any]]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    if from_ is not None and to is not None and from_ > to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be less than or equal to 'to'",
        )
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    try:
        return await repo.fetch_schedule(
            window_from=from_,
            window_to=to,
            geozone=geozone,
            client_id=client_id,
            organization_id=resolved_org_id,
        )
    except MaintenancePersistenceError:
        rows = MAINTENANCE_SCHEDULE
        if geozone:
            rows = [row for row in rows if row.get("geozone") == geozone]
        if client_id:
            rows = [row for row in rows if row.get("client_id") == client_id]
        return rows


async def _fetch_technician_visits_rows(
    *,
    claims: dict[str, Any],
    repo: MaintenanceRepo,
    from_: datetime | None,
    to: datetime | None,
    geozone: str | None,
    organization_id: str | None,
    technician_profile_id: str | None,
) -> list[dict[str, Any]]:
    _enforce_role(claims, _TECHNICIAN_ROLES)
    if from_ is not None and to is not None and from_ > to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be less than or equal to 'to'",
        )
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    role = _resolve_role(claims)
    requested_profile_id = technician_profile_id or _resolve_profile_id(claims)
    if role == "technician":
        own_profile_id = _resolve_profile_id(claims)
        if own_profile_id and technician_profile_id and technician_profile_id != own_profile_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technician scope mismatch",
            )
        requested_profile_id = own_profile_id
    try:
        return await repo.fetch_technician_visits(
            window_from=from_,
            window_to=to,
            geozone=geozone,
            organization_id=resolved_org_id,
            assigned_profile_id=requested_profile_id,
        )
    except MaintenancePersistenceError:
        rows = TECHNICIAN_VISITS
        if geozone:
            rows = [row for row in rows if row.get("geozone") == geozone]
        return rows


@router.get("/operations/fleet")
def operations_fleet(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    return FLEET_PLANTS


@router.get("/operations/plants/{plant_id}")
def operations_plant_detail(
    plant_id: str,
    claims: Annotated[dict, Depends(get_current_claims)],
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    for row in FLEET_PLANTS:
        if row["id"] == plant_id:
            alerts = [a for a in _war_room_alerts() if a["plantId"] == plant_id]
            return {"plant": row, "alerts": alerts}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")


@router.get("/operations/technicians")
def operations_technicians(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    return TECHNICIANS


@router.get("/alerts")
def alerts_http(
    claims: Annotated[dict, Depends(get_current_claims)],
    since: datetime | None = None,
    plant_id: str | None = None,
    severity: str | None = Query(default=None, pattern="^(info|warn|critical)$"),
) -> list[dict[str, Any]]:
    del claims
    out = ALERTS
    if since is not None:
        out = [item for item in out if _parse_ts(item["ts"]) >= since]
    if plant_id:
        out = [item for item in out if item["plant_id"] == plant_id]
    if severity:
        out = [item for item in out if item["severity"] == severity]
    return out


@router.get("/analytics/faults-by-zone")
async def faults_by_zone(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[FaultsByZoneRepo, Depends(get_faults_by_zone_repo)],
    response: Response,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    format: str | None = Query(default=None, pattern="^(json|csv)$"),
    geozone: str | None = None,
    client_id: str | None = None,
    organization_id: str | None = None,
) -> Any:
    payload = await _fetch_faults_by_zone_payload(
        claims=claims,
        repo=repo,
        response=response,
        from_=from_,
        to=to,
        organization_id=organization_id,
        client_id=client_id,
        geozone=geozone,
    )
    if format == "csv":
        csv_payload = _build_faults_by_zone_csv(payload)
        return Response(content=csv_payload, media_type="text/csv")
    return payload


@router.get("/analytics/faults-by-zone.csv")
async def faults_by_zone_csv(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[FaultsByZoneRepo, Depends(get_faults_by_zone_repo)],
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    geozone: str | None = None,
    client_id: str | None = None,
    organization_id: str | None = None,
) -> Response:
    payload = await _fetch_faults_by_zone_payload(
        claims=claims,
        repo=repo,
        response=None,
        from_=from_,
        to=to,
        organization_id=organization_id,
        client_id=client_id,
        geozone=geozone,
    )
    csv_payload = _build_faults_by_zone_csv(payload)
    return Response(content=csv_payload, media_type="text/csv")


@router.get("/maintenance/schedule", response_model=None)
async def maintenance_schedule(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    geozone: str | None = None,
    client_id: str | None = None,
    format: str | None = Query(default=None, pattern="^(json|csv)$"),
    organization_id: str | None = None,
) -> Any:
    rows = await _fetch_schedule_rows(
        claims=claims,
        repo=repo,
        from_=from_,
        to=to,
        geozone=geozone,
        client_id=client_id,
        organization_id=organization_id,
    )
    if format == "csv":
        csv_payload = _build_schedule_csv(rows)
        return Response(content=csv_payload, media_type="text/csv")
    return rows


@router.get("/maintenance/schedule.csv")
async def maintenance_schedule_csv(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    geozone: str | None = None,
    client_id: str | None = None,
    organization_id: str | None = None,
) -> Response:
    rows = await _fetch_schedule_rows(
        claims=claims,
        repo=repo,
        from_=from_,
        to=to,
        geozone=geozone,
        client_id=client_id,
        organization_id=organization_id,
    )
    csv_payload = _build_schedule_csv(rows)
    return Response(content=csv_payload, media_type="text/csv")


@router.post("/maintenance/complete")
async def maintenance_complete(
    body: dict[str, Any],
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    organization_id: str | None = None,
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    maintenance_id = body.get("maintenance_id")
    if not isinstance(maintenance_id, str) or not maintenance_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="maintenance_id required")
    notes = _normalize_optional_str(body.get("notes"), field_name="notes")
    checklist = _normalize_optional_str_list(body.get("checklist"), field_name="checklist")
    evidence = _normalize_optional_str_list(body.get("evidence"), field_name="evidence")
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    completed_at = datetime.now(tz=UTC)
    had_persistence_error = False
    try:
        persisted = await repo.complete_maintenance(
            maintenance_id=maintenance_id,
            completed_at=completed_at,
            notes=notes,
            checklist=checklist,
            evidence=evidence,
            organization_id=resolved_org_id,
        )
    except MaintenancePersistenceError:
        had_persistence_error = True
        persisted = None
    if persisted is not None:
        return persisted
    if had_persistence_error:
        result: dict[str, Any] = {
            "maintenance_id": maintenance_id,
            "status": "completed",
            "completed_at": completed_at.isoformat().replace("+00:00", "Z"),
        }
        if notes is not None:
            result["notes"] = notes
        if checklist is not None:
            result["checklist"] = checklist
        if evidence is not None:
            result["evidence"] = evidence
        return result
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance not found")


@router.patch("/maintenances/{maintenance_id}")
async def maintenance_reschedule(
    maintenance_id: str,
    body: dict[str, Any],
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    organization_id: str | None = None,
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    raw_next = body.get("next_scheduled_at")
    if not isinstance(raw_next, str) or not raw_next.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="next_scheduled_at required")
    try:
        next_scheduled_at = datetime.fromisoformat(raw_next.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="next_scheduled_at must be ISO-8601") from exc
    problem_summary = _normalize_optional_str(body.get("problem_summary"), field_name="problem_summary")
    assigned_profile_id = _normalize_optional_str(
        body.get("assigned_profile_id"),
        field_name="assigned_profile_id",
    )
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    try:
        persisted = await repo.reschedule_maintenance(
            maintenance_id=maintenance_id,
            next_scheduled_at=next_scheduled_at,
            problem_summary=problem_summary,
            assigned_profile_id=assigned_profile_id,
            organization_id=resolved_org_id,
        )
    except MaintenancePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Maintenance persistence unavailable") from exc
    if persisted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance not found")
    return persisted


@router.post("/maintenances/{maintenance_id}/cancel")
async def maintenance_cancel(
    maintenance_id: str,
    body: dict[str, Any],
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    organization_id: str | None = None,
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    reason = _normalize_optional_str(body.get("reason"), field_name="reason")
    resolved_org_id = _resolve_organization_id(claims, organization_id)
    cancelled_at = datetime.now(tz=UTC)
    try:
        persisted = await repo.cancel_maintenance(
            maintenance_id=maintenance_id,
            reason=reason,
            cancelled_at=cancelled_at,
            organization_id=resolved_org_id,
        )
    except MaintenancePersistenceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Maintenance persistence unavailable") from exc
    if persisted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance not found")
    return persisted


@router.get("/operations/war-room")
def operations_war_room(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    return _war_room_alerts()


@router.get("/corporate/overview")
def corporate_overview(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> dict[str, Any]:
    _enforce_role(claims, _CORPORATE_ROLES)
    return CORPORATE_OVERVIEW


@router.get("/corporate/roi")
def corporate_roi(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _CORPORATE_ROLES)
    return CORPORATE_ROI


@router.get("/corporate/kpis")
def corporate_kpis(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _CORPORATE_ROLES)
    return CORPORATE_KPIS


@router.get("/corporate/tickets")
def corporate_tickets(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _CORPORATE_ROLES)
    return CORPORATE_TICKETS


@router.get("/operations/schedule")
async def operations_schedule(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
) -> list[dict[str, Any]]:
    return await _fetch_schedule_rows(
        claims=claims,
        repo=repo,
        from_=None,
        to=None,
        geozone=None,
        client_id=None,
        organization_id=None,
    )


@router.get("/operations/telemetry-overview")
def operations_telemetry_overview(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    total_alerts = len(ALERTS)
    critical_alerts = len([item for item in ALERTS if item["severity"] == "critical"])
    return {
        "totals": {
            "plants": len(FLEET_PLANTS),
            "alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "scheduled_maintenances": len(MAINTENANCE_SCHEDULE),
        },
        "live": TECHNICIAN_TELEMETRY,
    }


@router.get("/technician/visits")
async def technician_visits(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    geozone: str | None = None,
    organization_id: str | None = None,
    technician_profile_id: str | None = None,
) -> list[dict[str, Any]]:
    return await _fetch_technician_visits_rows(
        claims=claims,
        repo=repo,
        from_=from_,
        to=to,
        geozone=geozone,
        organization_id=organization_id,
        technician_profile_id=technician_profile_id,
    )


@router.get("/technician/telemetry")
def technician_telemetry(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _TECHNICIAN_ROLES)
    return TECHNICIAN_TELEMETRY


@router.get("/technician/preventive-tasks")
def technician_preventive_tasks(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> list[dict[str, Any]]:
    _enforce_role(claims, _TECHNICIAN_ROLES)
    return TECHNICIAN_PREVENTIVE_TASKS


@router.get("/dashboard/operaciones")
def dashboard_operaciones(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> dict[str, Any]:
    _enforce_role(claims, _OPERATIONS_ROLES)
    return {
        "plants": FLEET_PLANTS,
        "alerts": _war_room_alerts(),
    }


@router.get("/dashboard/corporativo")
def dashboard_corporativo(
    claims: Annotated[dict, Depends(get_current_claims)],
) -> dict[str, Any]:
    _enforce_role(claims, _CORPORATE_ROLES)
    return {
        "overview": CORPORATE_OVERVIEW,
        "roi": CORPORATE_ROI,
        "kpis": CORPORATE_KPIS,
        "tickets": CORPORATE_TICKETS,
    }


@router.get("/dashboard/tecnico")
async def dashboard_tecnico(
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[MaintenanceRepo, Depends(get_maintenance_repo)],
) -> dict[str, Any]:
    _enforce_role(claims, _TECHNICIAN_ROLES)
    visits = await _fetch_technician_visits_rows(
        claims=claims,
        repo=repo,
        from_=None,
        to=None,
        geozone=None,
        organization_id=None,
        technician_profile_id=None,
    )
    return {
        "visits": visits,
        "telemetry": TECHNICIAN_TELEMETRY,
        "preventiveTasks": TECHNICIAN_PREVENTIVE_TASKS,
    }


@router.get("/sim/time-meta")
def sim_time_meta() -> dict[str, Any]:
    """Devuelve ventana temporal y presets disponibles para simulación.

    Endpoint público (sin auth) alineado con el contrato del mock-hub.
    """
    now = datetime.now(UTC)
    earliest = now - timedelta(days=90)
    return {
        "earliest": _to_zulu(earliest),
        "latest": _to_zulu(now),
        "now": _to_zulu(now),
        "defaultPreset": "24h",
        "presets": ["24h", "7d", "30d", "custom"],
        "contractVersion": "2026-04-18.sim.v1",
    }
