"""Contract tests for lane-db-rls-seed SQL artifacts."""

from __future__ import annotations

from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[3]
_CORE_MIGRATION = _ROOT / "supabase" / "migrations" / "20260418101500_p0_migration_core.sql"
_RLS_MIGRATION = _ROOT / "supabase" / "migrations" / "20260418103000_p0_rls_policies_helpers.sql"
_SEED = _ROOT / "supabase" / "seed.sql"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


@pytest.mark.unit
def test_core_migration_is_idempotent() -> None:
    sql = _read(_CORE_MIGRATION)
    assert "CREATE TABLE IF NOT EXISTS public.clients" in sql
    assert "CREATE TABLE IF NOT EXISTS public.maintenances" in sql
    assert "CREATE INDEX IF NOT EXISTS readings_plant_id_ts_desc_idx" in sql
    assert "DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;" in sql


@pytest.mark.unit
def test_rls_migration_uses_org_identity_and_role_guards() -> None:
    sql = _read(_RLS_MIGRATION)
    assert "private.current_user_org_id()" in sql
    assert "private.current_user_role()" in sql
    assert "CREATE POLICY p0_organizations_select" in sql
    assert "USING (id = private.current_user_org_id())" in sql
    assert "private.is_same_org(target_organization_id)" in sql
    assert "private.has_any_role(ARRAY['admin', 'technician'])" in sql


@pytest.mark.unit
def test_rls_migration_does_not_scope_by_provider_ids() -> None:
    sql = _read(_RLS_MIGRATION)
    assert "external_device_id" not in sql
    assert "vendor_slug" not in sql


@pytest.mark.unit
def test_seed_contains_multiple_organizations_with_domain_data() -> None:
    sql = _read(_SEED)
    assert "('Default', 'default')" in sql
    assert "('Techos Rentables Demo', 'tr-demo')" in sql
    assert "INSERT INTO public.clients" in sql
    assert "INSERT INTO public.plants" in sql
    assert "INSERT INTO public.client_users" in sql
