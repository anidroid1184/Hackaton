"""Cache TTL en memoria, simple y thread-safe."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from threading import RLock
import time
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _CacheEntry(Generic[T]):
    value: T
    expires_at: float


class MemoryTTLCache(Generic[T]):
    def __init__(
        self,
        default_ttl_seconds: float,
        now: Callable[[], float] | None = None,
        max_entries: int = 1024,
    ) -> None:
        self._default_ttl_seconds = default_ttl_seconds
        self._now = now or time.monotonic
        self._max_entries = max_entries
        self._entries: dict[str, _CacheEntry[T]] = {}
        self._lock = RLock()

    def get(self, key: str) -> T | None:
        now = self._now()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                del self._entries[key]
                return None
            return entry.value

    def set(self, key: str, value: T, ttl_seconds: float | None = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl_seconds
        expires_at = self._now() + ttl
        with self._lock:
            if len(self._entries) >= self._max_entries:
                self._evict_one(now=self._now())
            self._entries[key] = _CacheEntry(value=value, expires_at=expires_at)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [key for key in self._entries if key.startswith(prefix)]
            for key in keys:
                del self._entries[key]

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def _evict_one(self, now: float) -> None:
        expired_key = next(
            (key for key, entry in self._entries.items() if entry.expires_at <= now),
            None,
        )
        if expired_key is not None:
            del self._entries[expired_key]
            return
        first_key = next(iter(self._entries), None)
        if first_key is not None:
            del self._entries[first_key]
