"""Router `/ingest`: recibe lecturas crudas, normaliza y persiste en Supabase.

Auth: `X-Ingest-Key` (maquina-a-maquina). No usa JWT de usuario.
"""

from __future__ import annotations

from typing import Annotated
from uuid import uuid4

from cache.store import FAULTS_BY_ZONE_CACHE_PREFIX, STATS_CACHE_PREFIX, response_cache
from domain.inference import normalize_batch
from fastapi import APIRouter, Depends, status
from jwt_auth import get_settings
from persistence.supabase_rest import ReadingsRepo, SupabaseReadingsRepo
from schemas.ingest import IngestBatch, IngestResult
from security.ingest_key import verify_ingest_key
from settings import Settings

router = APIRouter(tags=["ingest"])


def get_readings_repo(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ReadingsRepo:
    """Factory real (sobreescribible via `app.dependency_overrides` en tests)."""
    return SupabaseReadingsRepo(settings=settings)


@router.post(
    "/ingest",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=IngestResult,
    dependencies=[Depends(verify_ingest_key)],
)
async def ingest(
    batch: IngestBatch,
    repo: Annotated[ReadingsRepo, Depends(get_readings_repo)],
) -> IngestResult:
    rows, rejected = normalize_batch(batch.readings, plant_id=batch.plant_id)
    await repo.insert_readings(rows)
    try:
        response_cache.invalidate_prefix(STATS_CACHE_PREFIX)
        response_cache.invalidate_prefix(FAULTS_BY_ZONE_CACHE_PREFIX)
    except Exception:
        # Fallback seguro: la ingesta no falla si la cache en memoria falla.
        pass
    return IngestResult(
        accepted=len(rows),
        rejected=rejected,
        batch_id=uuid4(),
    )
