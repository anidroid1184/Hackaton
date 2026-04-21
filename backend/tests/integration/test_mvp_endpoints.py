"""Integration tests de endpoints MVP user-facing."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient
from main import app
from persistence.analytics_repo import AnalyticsPersistenceError
from persistence.maintenance_repo import MaintenancePersistenceError
from routers.mvp import get_faults_by_zone_repo, get_maintenance_repo

SUPABASE_URL = "http://127.0.0.1:54321"
JWT_SECRET = "testsecret01234567890123456789012ab"


def _issuer() -> str:
    return f"{SUPABASE_URL.rstrip('/')}/auth/v1"


def _encode_token(payload_overrides: dict[str, Any] | None = None) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": "user-test-uuid",
        "aud": "authenticated",
        "iss": _issuer(),
        "exp": now + 3600,
        "iat": now,
        "role": "admin",
        "organization_id": "org-default",
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture(autouse=True)
def _jwt_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", JWT_SECRET)


class FakeFaultsRepo:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def fetch_faults_by_zone(
        self,
        *,
        window_from: datetime,
        window_to: datetime,
        organization_id: str | None,
        client_id: str | None,
        geozone: str | None,
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "from": window_from,
                "to": window_to,
                "organization_id": organization_id,
                "client_id": client_id,
                "geozone": geozone,
            }
        )
        buckets = [
            {
                "geozone": "Norte",
                "fault_count": 2,
                "normalized_rate": 1.25,
                "fault_types": [{"type": "arc_fault", "count": 2}],
            },
            {
                "geozone": "Sur",
                "fault_count": 1,
                "normalized_rate": 0.5,
                "fault_types": [{"type": "temp_rise", "count": 1}],
            },
        ]
        if geozone:
            buckets = [bucket for bucket in buckets if bucket["geozone"] == geozone]
        return {
            "window": {
                "from": window_from.astimezone(UTC).isoformat().replace("+00:00", "Z"),
                "to": window_to.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            },
            "buckets": buckets,
        }


class FakeMaintenanceRepo:
    def __init__(self) -> None:
        self.schedule_calls: list[dict[str, Any]] = []
        self.complete_calls: list[dict[str, Any]] = []
        self.reschedule_calls: list[dict[str, Any]] = []
        self.cancel_calls: list[dict[str, Any]] = []
        self.visits_calls: list[dict[str, Any]] = []
        self.force_schedule_error = False
        self.force_complete_error = False
        self.force_complete_not_found = False
        self.force_reschedule_error = False
        self.force_reschedule_not_found = False
        self.force_cancel_error = False
        self.force_cancel_not_found = False
        self.force_visits_error = False

    async def fetch_schedule(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        client_id: str | None = None,
        organization_id: str | None = None,
    ) -> list[dict[str, Any]]:
        self.schedule_calls.append(
            {
                "from": window_from,
                "to": window_to,
                "geozone": geozone,
                "client_id": client_id,
                "organization_id": organization_id,
            }
        )
        if self.force_schedule_error:
            raise MaintenancePersistenceError("schedule unavailable")
        rows = [
            {
                "id": "mnt-1001",
                "plant_name": "Lagos 1",
                "client_name": "Cliente Demo",
                "client_id": "client-100",
                "address_line": "Cra 1 # 2-3",
                "last_maintenance_at": None,
                "next_scheduled_at": "2026-04-20T10:00:00Z",
                "problem_summary": "Revisión de protecciones",
                "geozone": "Norte",
                "status": "scheduled",
                "suggested_technician_id": "tech-1",
            }
        ]
        if geozone:
            return [row for row in rows if row["geozone"] == geozone]
        if client_id:
            return [row for row in rows if row["client_id"] == client_id]
        return rows

    async def complete_maintenance(
        self,
        *,
        maintenance_id: str,
        completed_at: datetime,
        notes: str | None = None,
        checklist: list[str] | None = None,
        evidence: list[str] | None = None,
        organization_id: str | None = None,
    ) -> dict[str, Any] | None:
        self.complete_calls.append(
            {
                "maintenance_id": maintenance_id,
                "completed_at": completed_at,
                "notes": notes,
                "checklist": checklist,
                "evidence": evidence,
                "organization_id": organization_id,
            }
        )
        if self.force_complete_error:
            raise MaintenancePersistenceError("complete unavailable")
        if self.force_complete_not_found:
            return None
        return {
            "maintenance_id": maintenance_id,
            "status": "completed",
            "completed_at": completed_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        }

    async def reschedule_maintenance(
        self,
        *,
        maintenance_id: str,
        next_scheduled_at: datetime,
        problem_summary: str | None,
        assigned_profile_id: str | None,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        self.reschedule_calls.append(
            {
                "maintenance_id": maintenance_id,
                "next_scheduled_at": next_scheduled_at,
                "problem_summary": problem_summary,
                "assigned_profile_id": assigned_profile_id,
                "organization_id": organization_id,
            }
        )
        if self.force_reschedule_error:
            raise MaintenancePersistenceError("reschedule unavailable")
        if self.force_reschedule_not_found:
            return None
        return {
            "maintenance_id": maintenance_id,
            "status": "scheduled",
            "next_scheduled_at": next_scheduled_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "problem_summary": problem_summary or "",
            "assigned_profile_id": assigned_profile_id,
        }

    async def cancel_maintenance(
        self,
        *,
        maintenance_id: str,
        reason: str | None,
        cancelled_at: datetime,
        organization_id: str | None,
    ) -> dict[str, Any] | None:
        self.cancel_calls.append(
            {
                "maintenance_id": maintenance_id,
                "reason": reason,
                "cancelled_at": cancelled_at,
                "organization_id": organization_id,
            }
        )
        if self.force_cancel_error:
            raise MaintenancePersistenceError("cancel unavailable")
        if self.force_cancel_not_found:
            return None
        return {
            "maintenance_id": maintenance_id,
            "status": "cancelled",
            "cancelled_at": cancelled_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "reason": reason,
        }

    async def fetch_technician_visits(
        self,
        *,
        window_from: datetime | None,
        window_to: datetime | None,
        geozone: str | None,
        organization_id: str | None,
        assigned_profile_id: str | None,
    ) -> list[dict[str, Any]]:
        self.visits_calls.append(
            {
                "from": window_from,
                "to": window_to,
                "geozone": geozone,
                "organization_id": organization_id,
                "assigned_profile_id": assigned_profile_id,
            }
        )
        if self.force_visits_error:
            raise MaintenancePersistenceError("visits unavailable")
        return [
            {
                "id": "visit-1001",
                "plant": "Lagos 1",
                "address": "Cra 1 # 2-3",
                "geozone": geozone or "Norte",
                "window": "10:00 - 12:00",
                "ticketId": "tk-1001",
                "problemSummary": "Revisión de protecciones",
                "priority": "alta",
            }
        ]


@pytest.fixture
def faults_repo() -> FakeFaultsRepo:
    return FakeFaultsRepo()


@pytest.fixture
def maintenance_repo() -> FakeMaintenanceRepo:
    return FakeMaintenanceRepo()


@pytest.fixture
def client(faults_repo: FakeFaultsRepo, maintenance_repo: FakeMaintenanceRepo) -> TestClient:
    app.dependency_overrides[get_faults_by_zone_repo] = lambda: faults_repo
    app.dependency_overrides[get_maintenance_repo] = lambda: maintenance_repo
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.mark.integration
def test_alerts_filters_and_requires_jwt(client: TestClient) -> None:
    assert client.get("/alerts").status_code == 401

    token = _encode_token()
    response = client.get(
        "/alerts",
        params={
            "since": "2026-04-18T09:30:00Z",
            "plant_id": "plant-lagos-1",
            "severity": "critical",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["id"] == "alert-arc-001"


@pytest.mark.integration
def test_faults_by_zone_contract_requires_jwt_and_resolves_org_from_claims(
    client: TestClient,
    faults_repo: FakeFaultsRepo,
) -> None:
    assert client.get("/analytics/faults-by-zone").status_code == 401

    token = _encode_token(
        {
            "scope": "app profile",
            "app_metadata": {"app": {"organization_id": "org-claims"}},
        }
    )
    response = client.get(
        "/analytics/faults-by-zone",
        params={
            "from": "2026-04-10T00:00:00Z",
            "to": "2026-04-11T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "window" in body
    assert "buckets" in body
    assert body["window"]["from"] == "2026-04-10T00:00:00Z"
    assert body["window"]["to"] == "2026-04-11T00:00:00Z"
    assert faults_repo.calls[-1]["organization_id"] == "org-claims"
    assert faults_repo.calls[-1]["client_id"] is None
    assert faults_repo.calls[-1]["geozone"] is None


@pytest.mark.integration
def test_faults_by_zone_supports_client_and_geozone_filters(
    client: TestClient,
    faults_repo: FakeFaultsRepo,
) -> None:
    token = _encode_token({"organization_id": "org-default"})
    response = client.get(
        "/analytics/faults-by-zone",
        params={"client_id": "client-100", "geozone": "Norte"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["buckets"], list)
    assert len(body["buckets"]) == 1
    assert body["buckets"][0]["geozone"] == "Norte"
    assert faults_repo.calls[-1]["client_id"] == "client-100"
    assert faults_repo.calls[-1]["geozone"] == "Norte"


@pytest.mark.integration
def test_faults_by_zone_denies_cross_organization_scope(client: TestClient) -> None:
    token = _encode_token({"organization_id": "org-default"})
    response = client.get(
        "/analytics/faults-by-zone",
        params={"organization_id": "org-other"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Organization scope mismatch"


@pytest.mark.integration
def test_faults_by_zone_fallbacks_to_mock_when_persistence_fails(client: TestClient) -> None:
    class ErrorFaultsRepo:
        async def fetch_faults_by_zone(
            self,
            *,
            window_from: datetime,
            window_to: datetime,
            organization_id: str | None,
            client_id: str | None,
            geozone: str | None,
        ) -> dict[str, Any]:
            del window_from
            del window_to
            del organization_id
            del client_id
            del geozone
            raise AnalyticsPersistenceError("boom")

    app.dependency_overrides[get_faults_by_zone_repo] = lambda: ErrorFaultsRepo()
    token = _encode_token()
    response = client.get(
        "/analytics/faults-by-zone",
        params={"from": "2026-04-10T00:00:00Z", "to": "2026-04-11T00:00:00Z"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["window"]["from"] == "2026-04-10T00:00:00Z"
    assert body["window"]["to"] == "2026-04-11T00:00:00Z"
    assert isinstance(body["buckets"], list)


@pytest.mark.integration
def test_faults_by_zone_supports_csv_export_formats(
    client: TestClient,
    faults_repo: FakeFaultsRepo,
) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}

    csv_via_query = client.get(
        "/analytics/faults-by-zone",
        params={
            "format": "csv",
            "client_id": "client-100",
            "geozone": "Norte",
            "from": "2026-04-10T00:00:00Z",
            "to": "2026-04-11T00:00:00Z",
        },
        headers=headers,
    )
    assert csv_via_query.status_code == 200
    assert csv_via_query.headers["content-type"].startswith("text/csv")
    assert "geozone,fault_count,normalized_rate,fault_types" in csv_via_query.text
    assert "Norte,2,1.25,arc_fault:2" in csv_via_query.text
    assert any(
        call["client_id"] == "client-100" and call["geozone"] == "Norte"
        for call in faults_repo.calls
    )

    csv_dedicated = client.get(
        "/analytics/faults-by-zone.csv",
        params={
            "client_id": "client-100",
            "geozone": "Norte",
            "from": "2026-04-10T00:00:00Z",
            "to": "2026-04-11T00:00:00Z",
        },
        headers=headers,
    )
    assert csv_dedicated.status_code == 200
    assert csv_dedicated.headers["content-type"].startswith("text/csv")
    assert "geozone,fault_count,normalized_rate,fault_types" in csv_dedicated.text
    assert "Norte,2,1.25,arc_fault:2" in csv_dedicated.text


@pytest.mark.integration
def test_maintenance_schedule_and_complete_contract(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    assert client.get("/maintenance/schedule").status_code == 401
    assert client.post("/maintenance/complete", json={"maintenance_id": "mnt-1001"}).status_code == 401

    token = _encode_token({"app_metadata": {"app": {"organization_id": "org-claims-2"}}})
    schedule_response = client.get(
        "/maintenance/schedule",
        params={
            "from": "2026-04-10T00:00:00Z",
            "to": "2026-04-30T00:00:00Z",
            "geozone": "Norte",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert schedule_response.status_code == 200
    schedule_rows = schedule_response.json()
    assert isinstance(schedule_rows, list)
    assert schedule_rows[0]["id"] == "mnt-1001"
    last_schedule_call = maintenance_repo.schedule_calls[-1]
    assert last_schedule_call["geozone"] == "Norte"
    assert last_schedule_call["organization_id"] == "org-claims-2"

    complete_response = client.post(
        "/maintenance/complete",
        json={"maintenance_id": "mnt-1001"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "completed"


@pytest.mark.integration
def test_maintenance_schedule_invalid_window_returns_400(client: TestClient) -> None:
    token = _encode_token()
    response = client.get(
        "/maintenance/schedule",
        params={"from": "2026-04-20T10:00:00Z", "to": "2026-04-10T10:00:00Z"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


@pytest.mark.integration
def test_maintenance_complete_returns_404_when_not_found(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    maintenance_repo.force_complete_not_found = True
    token = _encode_token()
    response = client.post(
        "/maintenance/complete",
        json={"maintenance_id": "mnt-404"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.integration
def test_maintenance_complete_fallbacks_when_persistence_fails(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    maintenance_repo.force_complete_error = True
    token = _encode_token()
    response = client.post(
        "/maintenance/complete",
        json={"maintenance_id": "mnt-1001"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


@pytest.mark.integration
def test_maintenance_complete_accepts_enriched_body(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token()
    response = client.post(
        "/maintenance/complete",
        json={
            "maintenance_id": "mnt-1001",
            "notes": "Trabajo ejecutado sin hallazgos",
            "checklist": ["breaker_checked"],
            "evidence": ["https://example.com/photo-1.jpg"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert maintenance_repo.complete_calls[-1]["notes"] == "Trabajo ejecutado sin hallazgos"
    assert maintenance_repo.complete_calls[-1]["checklist"] == ["breaker_checked"]
    assert maintenance_repo.complete_calls[-1]["evidence"] == ["https://example.com/photo-1.jpg"]


@pytest.mark.integration
def test_maintenance_schedule_supports_client_filter_and_csv_export(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}

    by_client = client.get("/maintenance/schedule", params={"client_id": "client-100"}, headers=headers)
    assert by_client.status_code == 200
    rows = by_client.json()
    assert len(rows) == 1
    assert rows[0]["client_id"] == "client-100"
    assert maintenance_repo.schedule_calls[-1]["client_id"] == "client-100"

    csv_response = client.get("/maintenance/schedule.csv", params={"client_id": "client-100"}, headers=headers)
    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    csv_body = csv_response.text
    assert "id,plant_name,client_name,client_id" in csv_body
    assert "mnt-1001" in csv_body


@pytest.mark.integration
def test_reschedule_and_cancel_maintenance_endpoints(client: TestClient) -> None:
    token = _encode_token({"app_metadata": {"app": {"organization_id": "org-maint"}}})
    headers = {"Authorization": f"Bearer {token}"}

    reschedule = client.patch(
        "/maintenances/mnt-1001",
        json={
            "next_scheduled_at": "2026-05-01T10:00:00Z",
            "problem_summary": "Control termico",
            "assigned_profile_id": "tech-2",
        },
        headers=headers,
    )
    assert reschedule.status_code == 200
    assert reschedule.json()["status"] == "scheduled"
    assert reschedule.json()["maintenance_id"] == "mnt-1001"

    cancel = client.post(
        "/maintenances/mnt-1001/cancel",
        json={"reason": "Cliente solicito reagendar"},
        headers=headers,
    )
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"
    assert cancel.json()["maintenance_id"] == "mnt-1001"


@pytest.mark.integration
def test_reschedule_maintenance_error_and_not_found(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token({"app_metadata": {"app": {"organization_id": "org-maint"}}})
    headers = {"Authorization": f"Bearer {token}"}
    maintenance_repo.force_reschedule_error = True

    error = client.patch(
        "/maintenances/mnt-1001",
        json={"next_scheduled_at": "2026-05-01T10:00:00Z"},
        headers=headers,
    )
    assert error.status_code == 503

    maintenance_repo.force_reschedule_error = False
    maintenance_repo.force_reschedule_not_found = True
    not_found = client.patch(
        "/maintenances/mnt-missing",
        json={"next_scheduled_at": "2026-05-01T10:00:00Z"},
        headers=headers,
    )
    assert not_found.status_code == 404


@pytest.mark.integration
def test_cancel_maintenance_error_and_not_found(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token({"app_metadata": {"app": {"organization_id": "org-maint"}}})
    headers = {"Authorization": f"Bearer {token}"}
    maintenance_repo.force_cancel_error = True

    error = client.post(
        "/maintenances/mnt-1001/cancel",
        json={"reason": "error test"},
        headers=headers,
    )
    assert error.status_code == 503

    maintenance_repo.force_cancel_error = False
    maintenance_repo.force_cancel_not_found = True
    not_found = client.post(
        "/maintenances/mnt-missing/cancel",
        json={"reason": "not found test"},
        headers=headers,
    )
    assert not_found.status_code == 404


@pytest.mark.integration
def test_operations_and_overview_endpoints_contract(
    client: TestClient,
) -> None:
    assert client.get("/operations/war-room").status_code == 401

    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}

    war_room = client.get("/operations/war-room", headers=headers)
    assert war_room.status_code == 200
    assert war_room.json()[0]["plantId"] == "plant-lagos-1"

    fleet = client.get("/operations/fleet", headers=headers)
    assert fleet.status_code == 200
    assert fleet.json()[0]["id"] == "plant-lagos-1"

    schedule = client.get("/operations/schedule", headers=headers)
    assert schedule.status_code == 200
    assert schedule.json()[0]["id"] == "mnt-1001"

    telemetry_overview = client.get("/operations/telemetry-overview", headers=headers)
    assert telemetry_overview.status_code == 200
    telemetry_body = telemetry_overview.json()
    assert telemetry_body["totals"]["plants"] == 3
    assert telemetry_body["live"][0]["label"] == "Voltaje (Vo)"

    corporate = client.get("/corporate/overview", headers=headers)
    assert corporate.status_code == 200
    assert corporate.json()["criticalPlants"] == 1

    technician = client.get("/technician/telemetry", headers=headers)
    assert technician.status_code == 200
    assert technician.json()[0]["label"] == "Voltaje (Vo)"


@pytest.mark.integration
def test_operations_schedule_uses_repo_real(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token()
    response = client.get("/operations/schedule", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert maintenance_repo.schedule_calls, "Se esperaba llamada al repo de mantenimiento"


@pytest.mark.integration
def test_operations_endpoints_deny_client_role(client: TestClient) -> None:
    token = _encode_token({"role": "client"})
    response = client.get("/operations/fleet", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Role not allowed for this endpoint"


@pytest.mark.integration
def test_corporate_endpoints_allow_client_role(client: TestClient) -> None:
    token = _encode_token({"role": "client"})
    response = client.get("/corporate/overview", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["criticalPlants"] == 1


@pytest.mark.integration
def test_operations_plant_detail_alerts_use_war_room_contract(client: TestClient) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/operations/plants/plant-lagos-1", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["plant"]["id"] == "plant-lagos-1"
    assert isinstance(body["alerts"], list)
    assert body["alerts"][0]["plantId"] == "plant-lagos-1"
    assert "plant_id" not in body["alerts"][0]


@pytest.mark.integration
def test_dashboard_core_endpoints_are_available_for_adapter_compat(client: TestClient) -> None:
    token = _encode_token()
    headers = {"Authorization": f"Bearer {token}"}

    operations = client.get("/dashboard/operaciones", headers=headers)
    assert operations.status_code == 200
    operations_body = operations.json()
    assert isinstance(operations_body["plants"], list)
    assert isinstance(operations_body["alerts"], list)

    corporate = client.get("/dashboard/corporativo", headers=headers)
    assert corporate.status_code == 200
    corporate_body = corporate.json()
    assert isinstance(corporate_body["overview"], dict)
    assert isinstance(corporate_body["roi"], list)
    assert isinstance(corporate_body["kpis"], list)
    assert isinstance(corporate_body["tickets"], list)

    technician = client.get("/dashboard/tecnico", headers=headers)
    assert technician.status_code == 200
    technician_body = technician.json()
    assert isinstance(technician_body["visits"], list)
    assert isinstance(technician_body["telemetry"], list)
    assert isinstance(technician_body["preventiveTasks"], list)


@pytest.mark.integration
def test_technician_visits_uses_repo_with_filters_and_scope(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    token = _encode_token(
        {
            "role": "technician",
            "scope": "app profile",
            "app_metadata": {
                "app": {
                    "organization_id": "org-tech",
                    "profile_id": "profile-tech-1",
                }
            },
        }
    )
    response = client.get(
        "/technician/visits",
        params={
            "from": "2026-04-20T00:00:00Z",
            "to": "2026-04-21T00:00:00Z",
            "geozone": "Norte",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert body[0]["id"] == "visit-1001"
    assert maintenance_repo.visits_calls
    call = maintenance_repo.visits_calls[-1]
    assert call["organization_id"] == "org-tech"
    assert call["assigned_profile_id"] == "profile-tech-1"
    assert call["geozone"] == "Norte"


@pytest.mark.integration
def test_technician_visits_rejects_cross_profile_access_for_technician(client: TestClient) -> None:
    token = _encode_token(
        {
            "role": "technician",
            "scope": "app",
            "app_metadata": {
                "app": {
                    "organization_id": "org-tech",
                    "profile_id": "profile-tech-1",
                }
            },
        }
    )
    response = client.get(
        "/technician/visits",
        params={"technician_profile_id": "profile-tech-2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Technician scope mismatch"


@pytest.mark.integration
def test_technician_visits_falls_back_when_persistence_fails(
    client: TestClient,
    maintenance_repo: FakeMaintenanceRepo,
) -> None:
    maintenance_repo.force_visits_error = True
    token = _encode_token(
        {
            "role": "technician",
            "scope": "app",
            "app_metadata": {"app": {"organization_id": "org-tech"}},
        }
    )
    response = client.get("/technician/visits", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) > 0
