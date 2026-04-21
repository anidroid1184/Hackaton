"""Datos MVP normalizados para vistas operaciones/corporativo/tecnico.

Fuente temporal para `DATA_SOURCE=mock` mientras se completa la capa SQL real.
"""

from __future__ import annotations

import hashlib
from typing import Any


def _deterministic_plant_kpis(name: str) -> dict[str, float]:
    """KPIs estables por nombre de planta; mismo name => mismo KPI."""
    digest = hashlib.md5(name.encode("utf-8")).hexdigest()
    seed_energy = int(digest[0:8], 16)
    seed_pf = int(digest[8:16], 16)
    seed_up = int(digest[16:24], 16)
    return {
        "energyKwh": 120 + (seed_energy % 361),
        "powerFactor": round(0.88 + (seed_pf % 91) / 1000.0, 3),
        "uptimePct": round(94.0 + (seed_up % 56) / 10.0, 1),
    }


FLEET_PLANTS: list[dict[str, Any]] = [
    {
        "id": "plant-lagos-1",
        "plantName": "Planta Lagos Norte",
        "clientName": "Alimentos Andina",
        "addressLine": "Calle 120 #18-44, Bogota",
        "geozone": "Zona Norte",
        "status": "critical",
        "lastMaintenanceAt": "2026-04-04T09:00:00Z",
        "nextScheduledAt": "2026-04-20T14:00:00Z",
        "activeAlerts": 3,
        "kpis": _deterministic_plant_kpis("Planta Lagos Norte"),
    },
    {
        "id": "plant-sur-2",
        "plantName": "Parque Solar Sur",
        "clientName": "Textiles Capital",
        "addressLine": "Carrera 49 #7-20, Cali",
        "geozone": "Zona Sur",
        "status": "warn",
        "lastMaintenanceAt": "2026-04-10T11:30:00Z",
        "nextScheduledAt": "2026-04-24T10:00:00Z",
        "activeAlerts": 1,
        "kpis": _deterministic_plant_kpis("Parque Solar Sur"),
    },
    {
        "id": "plant-centro-3",
        "plantName": "Centro Logistico TR",
        "clientName": "Logistica Delta",
        "addressLine": "Av 6N #33-90, Medellin",
        "geozone": "Zona Centro",
        "status": "ok",
        "lastMaintenanceAt": "2026-04-15T08:00:00Z",
        "nextScheduledAt": "2026-05-02T08:30:00Z",
        "activeAlerts": 0,
        "kpis": _deterministic_plant_kpis("Centro Logistico TR"),
    },
]

ALERTS: list[dict[str, Any]] = [
    {
        "id": "alert-arc-001",
        "type": "arc_fault",
        "severity": "critical",
        "ts": "2026-04-18T10:04:00Z",
        "plant_id": "plant-lagos-1",
        "device_id": "inv-11",
        "payload": {
            "summary": "Arco electrico detectado en string S2 durante 14s",
            "plantName": "Planta Lagos Norte",
            "geozone": "Zona Norte",
            "suggestedTechnicianName": "Camilo Rojas",
        },
    },
    {
        "id": "alert-breaker-002",
        "type": "breaker_fatigue",
        "severity": "warn",
        "ts": "2026-04-18T09:10:00Z",
        "plant_id": "plant-sur-2",
        "device_id": "inv-08",
        "payload": {
            "summary": "Patron de fatiga en breaker principal (12 eventos/48h)",
            "plantName": "Parque Solar Sur",
            "geozone": "Zona Sur",
            "suggestedTechnicianName": "Luisa Leon",
        },
    },
    {
        "id": "alert-offline-003",
        "type": "offline",
        "severity": "info",
        "ts": "2026-04-18T08:20:00Z",
        "plant_id": "plant-centro-3",
        "device_id": "gw-23",
        "payload": {
            "summary": "Gateway de telemetria con perdida intermitente",
            "plantName": "Centro Logistico TR",
            "geozone": "Zona Centro",
            "suggestedTechnicianName": "Andres Pava",
        },
    },
]

FAULTS_BY_ZONE: dict[str, Any] = {
    "window": {
        "from": "2026-04-01T00:00:00Z",
        "to": "2026-04-18T23:59:59Z",
    },
    "buckets": [
        {
            "geozone": "Zona Norte",
            "fault_count": 14,
            "normalized_rate": 2.7,
            "fault_types": [
                {"type": "arc_fault", "count": 7},
                {"type": "breaker_fatigue", "count": 3},
                {"type": "degradation", "count": 2},
                {"type": "offline", "count": 1},
                {"type": "out_of_range", "count": 1},
            ],
        },
        {
            "geozone": "Zona Sur",
            "fault_count": 9,
            "normalized_rate": 1.6,
            "fault_types": [
                {"type": "arc_fault", "count": 2},
                {"type": "breaker_fatigue", "count": 3},
                {"type": "degradation", "count": 2},
                {"type": "offline", "count": 1},
                {"type": "out_of_range", "count": 1},
            ],
        },
        {
            "geozone": "Zona Centro",
            "fault_count": 4,
            "normalized_rate": 0.8,
            "fault_types": [
                {"type": "arc_fault", "count": 0},
                {"type": "breaker_fatigue", "count": 1},
                {"type": "degradation", "count": 1},
                {"type": "offline", "count": 1},
                {"type": "out_of_range", "count": 1},
            ],
        },
    ],
}

MAINTENANCE_SCHEDULE: list[dict[str, Any]] = [
    {
        "id": "mnt-1001",
        "plant_name": "Planta Lagos Norte",
        "client_name": "Alimentos Andina",
        "address_line": "Calle 120 #18-44, Bogota",
        "last_maintenance_at": "2026-04-04T09:00:00Z",
        "next_scheduled_at": "2026-04-20T14:00:00Z",
        "problem_summary": "Arco electrico recurrente en string S2",
        "geozone": "Zona Norte",
        "assigned_technician": "Camilo Rojas",
    },
    {
        "id": "mnt-1002",
        "plant_name": "Parque Solar Sur",
        "client_name": "Textiles Capital",
        "address_line": "Carrera 49 #7-20, Cali",
        "last_maintenance_at": "2026-04-10T11:30:00Z",
        "next_scheduled_at": "2026-04-24T10:00:00Z",
        "problem_summary": "Revisar breaker principal y termografia",
        "geozone": "Zona Sur",
        "assigned_technician": "Luisa Leon",
    },
    {
        "id": "mnt-1003",
        "plant_name": "Centro Logistico TR",
        "client_name": "Logistica Delta",
        "address_line": "Av 6N #33-90, Medellin",
        "last_maintenance_at": "2026-04-15T08:00:00Z",
        "next_scheduled_at": "2026-05-02T08:30:00Z",
        "problem_summary": "Inspeccion preventiva mensual",
        "geozone": "Zona Centro",
        "assigned_technician": "Andres Pava",
    },
]

TECHNICIANS: list[dict[str, Any]] = [
    {
        "id": "tech-001",
        "full_name": "Camilo Rojas",
        "geozone": "Zona Norte",
        "phone": "+57 300 100 2201",
        "status": "busy",
    },
    {
        "id": "tech-002",
        "full_name": "Luisa Leon",
        "geozone": "Zona Sur",
        "phone": "+57 300 100 2202",
        "status": "active",
    },
    {
        "id": "tech-003",
        "full_name": "Andres Pava",
        "geozone": "Zona Centro",
        "phone": "+57 300 100 2203",
        "status": "active",
    },
]

CORPORATE_OVERVIEW: dict[str, Any] = {
    "roiAccumulatedCop": 7400000,
    "paybackMonths": 26,
    "monthlySavingsCop": 1480000,
    "criticalPlants": 1,
    "riskExposureCop": 920000,
    "openTickets": 2,
    "compliancePct": 87,
}

_CORPORATE_MONTHS_ES: tuple[str, ...] = (
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
)
_SEASONAL_KWH: tuple[float, ...] = (
    0.85,
    0.88,
    0.92,
    0.95,
    0.97,
    0.99,
    1.0,
    0.99,
    0.96,
    0.93,
    0.89,
    0.86,
)

CORPORATE_ROI: list[dict[str, Any]] = [
    {
        "month": month,
        "savingsCop": round(4_200_000 + i * 280_000),
        "targetCop": round(3_900_000 + i * 150_000),
        "promisedKwh": round(90000 * _SEASONAL_KWH[i] * 0.95),
        "generatedKwh": round(90000 * _SEASONAL_KWH[i] * (0.98 + (i % 5) * 0.008)),
    }
    for i, month in enumerate(_CORPORATE_MONTHS_ES)
]

CORPORATE_KPIS: list[dict[str, Any]] = [
    {
        "id": "kpi-1",
        "plant": "Planta Norte",
        "vo": 228,
        "io": 17.2,
        "fp": 0.96,
        "hz": 60.0,
        "errorType": "out_of_range",
        "errorDetail": "Pico de corriente fuera de rango por 6m",
        "energyKwh": 1320,
        "status": "ok",
    },
    {
        "id": "kpi-2",
        "plant": "Planta Sur",
        "vo": 215,
        "io": 16.3,
        "fp": 0.89,
        "hz": 59.8,
        "errorType": "breaker_fatigue",
        "errorDetail": "12 disparos en 48h",
        "energyKwh": 1180,
        "status": "warn",
    },
    {
        "id": "kpi-3",
        "plant": "Planta Centro",
        "vo": 204,
        "io": 15.9,
        "fp": 0.81,
        "hz": 59.7,
        "errorType": "arc_fault",
        "errorDetail": "Arco detectado en string S2 con corte automatico",
        "energyKwh": 970,
        "status": "critical",
    },
]

CORPORATE_TICKETS: list[dict[str, Any]] = [
    {
        "id": "tk-9001",
        "title": "Revision de string por sobretemperatura",
        "state": "en_progreso",
        "nextVisitAt": "2026-04-22T09:30:00Z",
        "slaHours": 8,
        "impactCop": 580000,
    },
    {
        "id": "tk-9002",
        "title": "Validar caida de factor de potencia",
        "state": "abierto",
        "nextVisitAt": "2026-04-23T14:00:00Z",
        "slaHours": 24,
        "impactCop": 340000,
    },
]

TECHNICIAN_VISITS: list[dict[str, Any]] = [
    {
        "id": "fv-1",
        "plant": "Planta Lagos Norte",
        "address": "Calle 120 #18-44, Bogota",
        "geozone": "Zona Norte",
        "window": "08:00 - 10:00",
        "ticketId": "tk-9001",
        "problemSummary": "Arco electrico en string S2",
        "priority": "alta",
    },
    {
        "id": "fv-2",
        "plant": "Parque Solar Sur",
        "address": "Carrera 49 #7-20, Cali",
        "geozone": "Zona Sur",
        "window": "11:30 - 13:00",
        "ticketId": "tk-9002",
        "problemSummary": "Fatiga de breaker principal",
        "priority": "media",
    },
]

TECHNICIAN_TELEMETRY: list[dict[str, Any]] = [
    {"label": "Voltaje (Vo)", "value": "224 V", "source": "live"},
    {"label": "Corriente (Io)", "value": "16.8 A", "source": "live"},
    {"label": "Factor potencia (fp)", "value": "0.93", "source": "live"},
    {"label": "Frecuencia (Hz)", "value": "59.9 Hz", "source": "buffer"},
]

TECHNICIAN_PREVENTIVE_TASKS: list[dict[str, Any]] = [
    {
        "id": "task-1",
        "title": "Inspeccionar aislamiento en string S2",
        "state": "pendiente",
        "critical": True,
    },
    {
        "id": "task-2",
        "title": "Prueba termografica en breaker principal",
        "state": "pendiente",
        "critical": True,
    },
    {
        "id": "task-3",
        "title": "Registro fotografico de tablero",
        "state": "realizada",
        "critical": False,
    },
]
