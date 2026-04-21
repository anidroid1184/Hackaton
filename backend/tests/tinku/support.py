"""Utilidades manifest Tinku (sustitución env, validación opcional)."""

from __future__ import annotations

import os
from typing import Any


def substitute_env_strings(obj: Any) -> Any:
    """Sustituye patrones ``${VAR}`` en strings; recorre dict/list."""
    if isinstance(obj, str) and obj.startswith("${") and obj.endswith("}"):
        return os.environ.get(obj[2:-1])
    if isinstance(obj, dict):
        return {k: substitute_env_strings(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [substitute_env_strings(v) for v in obj]
    return obj


def manifest_missing_required_env(entry: dict[str, Any]) -> list[str]:
    """Lista ``requires_env`` del manifest cuyo valor falta en el entorno."""
    req = entry.get("requires_env") or []
    return [str(name) for name in req if not os.environ.get(str(name))]


# Claves que en APIs Deye/Growatt/Huawei suelen ir como número aunque vengan de env (string).
_ID_NUMERIC_KEYS = frozenset({"stationId", "plantId", "plant_id", "devId", "page", "size"})


def coerce_env_numeric_ids(obj: Any) -> Any:
    """Convierte strings solo-dígitos a ``int`` en claves típicas de body/query."""
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            cv = coerce_env_numeric_ids(v)
            if k == "stationIds" and isinstance(cv, list):
                out[k] = [_list_elem_to_int_if_digits(x) for x in cv]
            elif k in _ID_NUMERIC_KEYS and isinstance(cv, str) and cv.isdigit():
                out[k] = int(cv)
            else:
                out[k] = cv
        return out
    if isinstance(obj, list):
        return [coerce_env_numeric_ids(v) for v in obj]
    return obj


def _list_elem_to_int_if_digits(x: Any) -> Any:
    if isinstance(x, str) and x.isdigit():
        return int(x)
    return x
