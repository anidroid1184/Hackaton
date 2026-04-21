#!/usr/bin/env python3
"""Idempotent seeder for 4 demo users across the canonical app roles.

Creates (or reuses) real Supabase auth users via the Admin API, then upserts
their profile row with the correct role/org and, when applicable, links them
to the demo client via public.client_users.

Reads credentials and target emails/passwords from the repo root `.env`.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

DEFAULT_CLIENT_ID = "10000000-0000-0000-0000-000000000001"
CORPORATE_CLIENT_ID = "20000000-0000-0000-0000-000000000001"

ROLE_SPECS = [
    {
        "role": "client",
        "env_email": "VITE_CLIENT_MOCK_EMAIL",
        "env_password": "VITE_CLIENT_MOCK_PASSWORD",
        "env_name": "VITE_CLIENT_MOCK_NAME",
        "organization_slug": "default",
        "client_id": DEFAULT_CLIENT_ID,
    },
    {
        "role": "operations",
        "env_email": "VITE_OPERATIONS_MOCK_EMAIL",
        "env_password": "VITE_OPERATIONS_MOCK_PASSWORD",
        "env_name": "VITE_OPERATIONS_MOCK_NAME",
        "organization_slug": "tr-demo",
        "client_id": None,
    },
    {
        "role": "corporate",
        "env_email": "VITE_CORPORATE_MOCK_EMAIL",
        "env_password": "VITE_CORPORATE_MOCK_PASSWORD",
        "env_name": "VITE_CORPORATE_MOCK_NAME",
        "organization_slug": "tr-demo",
        "client_id": CORPORATE_CLIENT_ID,
    },
    {
        "role": "technician",
        "env_email": "VITE_TECHNICIAN_MOCK_EMAIL",
        "env_password": "VITE_TECHNICIAN_MOCK_PASSWORD",
        "env_name": "VITE_TECHNICIAN_MOCK_NAME",
        "organization_slug": "tr-demo",
        "client_id": None,
    },
]


def load_env() -> dict[str, str]:
    data: dict[str, str] = {}
    if not ENV_PATH.exists():
        raise SystemExit(f"ERR: .env not found at {ENV_PATH}")
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        data[key.strip()] = value
    return data


def req(
    method: str,
    url: str,
    headers: dict[str, str],
    body: object | None = None,
) -> tuple[int, object]:
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=payload, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            parsed: object = json.loads(raw) if raw else None
            return resp.status, parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            return exc.code, json.loads(raw)
        except Exception:
            return exc.code, {"error": raw}
    except urllib.error.URLError as exc:
        return 0, {"error": str(exc)}


def service_headers(service_key: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def get_org_id(base_url: str, service_key: str, slug: str) -> str | None:
    query = urllib.parse.urlencode({"slug": f"eq.{slug}", "select": "id"})
    url = f"{base_url}/rest/v1/organizations?{query}"
    status, body = req("GET", url, service_headers(service_key))
    if status == 200 and isinstance(body, list) and body:
        return body[0].get("id")
    return None


def find_user_id(base_url: str, service_key: str, email: str) -> str | None:
    # Supabase admin list: filter via query string.
    query = urllib.parse.urlencode({"email": email})
    url = f"{base_url}/auth/v1/admin/users?{query}"
    status, body = req("GET", url, service_headers(service_key))
    if status != 200 or not isinstance(body, dict):
        return None
    users = body.get("users") if isinstance(body.get("users"), list) else body.get("data")
    if not isinstance(users, list):
        return None
    for user in users:
        if isinstance(user, dict) and user.get("email", "").lower() == email.lower():
            return user.get("id")
    return None


def create_or_get_user(
    base_url: str,
    service_key: str,
    email: str,
    password: str,
    role: str,
    display_name: str,
    organization_slug: str,
) -> tuple[str | None, str]:
    url = f"{base_url}/auth/v1/admin/users"
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "role": role,
            "display_name": display_name,
            "organization_slug": organization_slug,
        },
    }
    status, payload = req("POST", url, service_headers(service_key), body)
    if status in (200, 201) and isinstance(payload, dict):
        user_id = payload.get("id") or (payload.get("user") or {}).get("id")
        if user_id:
            return user_id, "created"

    message = ""
    if isinstance(payload, dict):
        message = json.dumps(payload).lower()
    duplicate_markers = ("already", "exists", "duplicate", "email_exists", "registered")
    if status in (400, 409, 422) and any(marker in message for marker in duplicate_markers):
        existing = find_user_id(base_url, service_key, email)
        if existing:
            return existing, "reused"

    existing = find_user_id(base_url, service_key, email)
    if existing:
        return existing, "reused"

    return None, f"failed status={status} body={payload!r}"


def upsert_profile(
    base_url: str,
    service_key: str,
    user_id: str,
    organization_id: str,
    role: str,
    full_name: str,
) -> tuple[bool, object]:
    url = f"{base_url}/rest/v1/profiles?on_conflict=id"
    headers = service_headers(
        service_key,
        {"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    body = [
        {
            "id": user_id,
            "organization_id": organization_id,
            "role": role,
            "full_name": full_name,
        }
    ]
    status, payload = req("POST", url, headers, body)
    return status in (200, 201), payload


def link_client_user(
    base_url: str,
    service_key: str,
    client_id: str,
    profile_id: str,
) -> tuple[bool, object]:
    url = f"{base_url}/rest/v1/client_users?on_conflict=client_id,profile_id"
    headers = service_headers(
        service_key,
        {"Prefer": "resolution=ignore-duplicates,return=representation"},
    )
    body = [{"client_id": client_id, "profile_id": profile_id}]
    status, payload = req("POST", url, headers, body)
    return status in (200, 201), payload


def main() -> int:
    env = load_env()
    base_url = env.get("SUPABASE_URL")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        print("ERR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env", file=sys.stderr)
        return 1

    base_url = base_url.rstrip("/")

    org_cache: dict[str, str] = {}
    failures: list[str] = []

    for spec in ROLE_SPECS:
        role = spec["role"]
        email = env.get(spec["env_email"], "")
        password = env.get(spec["env_password"], "")
        display_name = env.get(spec["env_name"], role.capitalize())
        org_slug = spec["organization_slug"]

        if not email or not password:
            failures.append(f"{role}: missing email/password in .env")
            print(f"FAIL role={role} missing env vars")
            continue

        if org_slug not in org_cache:
            org_id = get_org_id(base_url, service_key, org_slug)
            if not org_id:
                failures.append(f"{role}: organization slug '{org_slug}' not found")
                print(f"FAIL role={role} org_slug={org_slug} not found")
                continue
            org_cache[org_slug] = org_id
        org_id = org_cache[org_slug]

        user_id, status_note = create_or_get_user(
            base_url,
            service_key,
            email,
            password,
            role,
            display_name,
            org_slug,
        )
        if not user_id:
            failures.append(f"{role}: {status_note}")
            print(f"FAIL role={role} {status_note}")
            continue

        ok, profile_payload = upsert_profile(
            base_url, service_key, user_id, org_id, role, display_name
        )
        if not ok:
            failures.append(f"{role}: profile upsert failed body={profile_payload!r}")
            print(f"FAIL role={role} profile upsert failed body={profile_payload!r}")
            continue

        if spec["client_id"]:
            linked, link_payload = link_client_user(
                base_url, service_key, spec["client_id"], user_id
            )
            if not linked:
                failures.append(
                    f"{role}: client_users link failed body={link_payload!r}"
                )
                print(
                    f"FAIL role={role} client_users link failed body={link_payload!r}"
                )
                continue

        print(f"OK role={role} id={user_id} email={email} status={status_note}")

    if failures:
        print(f"SEED_FAILED count={len(failures)}", file=sys.stderr)
        return 1
    print("SEED_DONE all 4 roles provisioned")
    return 0


if __name__ == "__main__":
    sys.exit(main())
