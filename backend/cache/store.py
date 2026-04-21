"""Store compartido de cache de respuestas para endpoints HTTP."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar

from cache.ttl import MemoryTTLCache

T = TypeVar("T")

STATS_CACHE_PREFIX = "stats:"
FAULTS_BY_ZONE_CACHE_PREFIX = "faults-by-zone:"

response_cache: MemoryTTLCache[object] = MemoryTTLCache(default_ttl_seconds=30.0)


def build_cache_key(prefix: str, params: dict[str, object]) -> str:
    parts = [prefix]
    for key in sorted(params):
        value = params[key]
        parts.append(f"{key}={value}")
    return "|".join(parts)


async def safe_cached_async(
    *,
    key: str,
    ttl_seconds: float,
    loader: Callable[[], Awaitable[T]],
) -> tuple[T, bool]:
    try:
        cached = response_cache.get(key)
    except Exception:
        cached = None
    if cached is not None:
        return cached, True  # type: ignore[return-value]

    value = await loader()
    try:
        response_cache.set(key, value, ttl_seconds=ttl_seconds)
    except Exception:
        pass
    return value, False
