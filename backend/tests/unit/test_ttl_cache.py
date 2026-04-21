"""Unit tests para cache TTL en memoria."""

from __future__ import annotations

from cache.ttl import MemoryTTLCache


def test_memory_ttl_cache_hit_miss_and_expiration() -> None:
    now_tick = [100.0]

    def now() -> float:
        return now_tick[0]

    cache = MemoryTTLCache(default_ttl_seconds=10.0, now=now)
    assert cache.get("stats:a") is None

    cache.set("stats:a", {"ok": True})
    assert cache.get("stats:a") == {"ok": True}

    now_tick[0] += 11.0
    assert cache.get("stats:a") is None


def test_memory_ttl_cache_invalidate_prefix() -> None:
    cache = MemoryTTLCache(default_ttl_seconds=60.0)
    cache.set("stats:a", 1)
    cache.set("stats:b", 2)
    cache.set("analytics:c", 3)

    cache.invalidate_prefix("stats:")

    assert cache.get("stats:a") is None
    assert cache.get("stats:b") is None
    assert cache.get("analytics:c") == 3
