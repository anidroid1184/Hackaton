"""Router `/stats/{client_id}` compatible con Time Slider (`from`/`to`)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from cache.store import STATS_CACHE_PREFIX, build_cache_key, safe_cached_async
from domain.stats import aggregate_client_stats, aggregate_electrical_health_comparison
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from jwt_auth import get_current_claims, get_settings
from persistence.stats_repo import StatsRepo, SupabaseStatsRepo
from schemas.stats import ClientStats, ElectricalHealthComparisonResponse
from settings import Settings

router = APIRouter(tags=["stats"])

_DEFAULT_WINDOW_HOURS = 24
_DEFAULT_TARIFF_USD_PER_KWH = 0.2
_DEFAULT_GRID_FACTOR_KG_CO2_PER_KWH = 0.43
_STATS_CACHE_TTL_SECONDS = 30.0


def get_stats_repo(
    settings: Annotated[Settings, Depends(get_settings)],
) -> StatsRepo:
    if settings.data_source == "mock":
        return MockStatsRepo()
    return SupabaseStatsRepo(settings=settings)


@router.get(
    "/stats/{client_id}",
    response_model=ClientStats,
    status_code=status.HTTP_200_OK,
)
async def get_client_stats(
    client_id: UUID,
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[StatsRepo, Depends(get_stats_repo)],
    response: Response,
    from_: Annotated[datetime | None, Query(alias="from")] = None,
    to: datetime | None = None,
) -> ClientStats:
    del claims

    to_dt = to or datetime.now(tz=UTC)
    from_dt = from_ or (to_dt - timedelta(hours=_DEFAULT_WINDOW_HOURS))
    if from_dt > to_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be less than or equal to 'to'",
        )

    cache_key = build_cache_key(
        STATS_CACHE_PREFIX,
        {
            "client_id": str(client_id),
            "from": from_dt.isoformat(),
            "to": to_dt.isoformat(),
        },
    )

    async def _loader() -> ClientStats:
        rows = await repo.fetch_readings_for_client(
            client_id=client_id,
            window_from=from_dt,
            window_to=to_dt,
        )
        return aggregate_client_stats(
            client_id=client_id,
            window_from=from_dt,
            window_to=to_dt,
            samples=rows,
            tariff_usd_per_kwh=_DEFAULT_TARIFF_USD_PER_KWH,
            grid_factor_kg_co2_per_kwh=_DEFAULT_GRID_FACTOR_KG_CO2_PER_KWH,
        )

    payload, is_hit = await safe_cached_async(
        key=cache_key,
        ttl_seconds=_STATS_CACHE_TTL_SECONDS,
        loader=_loader,
    )
    response.headers["X-Cache"] = "HIT" if is_hit else "MISS"
    return payload


@router.get(
    "/stats/{client_id}/electrical-health/compare",
    response_model=ElectricalHealthComparisonResponse,
    status_code=status.HTTP_200_OK,
)
async def get_electrical_health_comparison(
    client_id: UUID,
    claims: Annotated[dict, Depends(get_current_claims)],
    repo: Annotated[StatsRepo, Depends(get_stats_repo)],
    from_: Annotated[datetime | None, Query(alias="from")] = None,
    to: datetime | None = None,
    by: Annotated[str, Query(pattern="^(zone|system)$")] = "zone",
) -> ElectricalHealthComparisonResponse:
    del claims
    to_dt = to or datetime.now(tz=UTC)
    from_dt = from_ or (to_dt - timedelta(hours=_DEFAULT_WINDOW_HOURS))
    if from_dt > to_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be less than or equal to 'to'",
        )
    rows = await repo.fetch_readings_for_client(
        client_id=client_id,
        window_from=from_dt,
        window_to=to_dt,
    )
    return aggregate_electrical_health_comparison(
        client_id=client_id,
        window_from=from_dt,
        window_to=to_dt,
        samples=rows,
        compare_by=by,
    )
