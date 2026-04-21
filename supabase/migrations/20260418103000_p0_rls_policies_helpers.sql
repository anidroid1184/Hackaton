-- p0 rls: helper functions + policies with tenant isolation by organization_id

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.has_any_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(private.current_user_role() = ANY(allowed_roles), false);
$$;

CREATE OR REPLACE FUNCTION private.is_same_org(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(private.current_user_org_id() = target_organization_id, false);
$$;

CREATE OR REPLACE FUNCTION private.is_org_member(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT
    private.is_same_org(target_organization_id)
    AND private.has_any_role(ARRAY['admin', 'technician']);
$$;

CREATE OR REPLACE FUNCTION private.is_client_member(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users cu
    JOIN public.clients c
      ON c.id = cu.client_id
    WHERE cu.profile_id = auth.uid()
      AND private.current_user_role() = 'client'
      AND cu.client_id = target_client_id
      AND private.is_same_org(c.organization_id)
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_client_row(
  target_organization_id uuid,
  target_client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT
    private.is_same_org(target_organization_id)
    AND (
      private.is_org_member(target_organization_id)
      OR private.is_client_member(target_client_id)
    );
$$;

CREATE OR REPLACE FUNCTION private.can_access_plant(target_plant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.plants p
    WHERE p.id = target_plant_id
      AND private.can_access_client_row(p.organization_id, p.client_id)
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_zone(target_zone_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.zones z
    WHERE z.id = target_zone_id
      AND private.is_same_org(z.organization_id)
      AND (
        private.is_org_member(z.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.plants p
          JOIN public.client_users cu
            ON cu.client_id = p.client_id
          WHERE p.zone_id = z.id
            AND cu.profile_id = auth.uid()
            AND private.current_user_role() = 'client'
        )
      )
  );
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select_authenticated ON public.organizations;
DROP POLICY IF EXISTS p0_organizations_select ON public.organizations;
CREATE POLICY p0_organizations_select
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (id = private.current_user_org_id());

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS p0_profiles_select ON public.profiles;
CREATE POLICY p0_profiles_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR private.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS p0_profiles_update ON public.profiles;
CREATE POLICY p0_profiles_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR private.is_org_member(organization_id)
  )
  WITH CHECK (
    auth.uid() = id
    OR private.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS p0_clients_select ON public.clients;
CREATE POLICY p0_clients_select
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (private.can_access_client_row(organization_id, id));

DROP POLICY IF EXISTS p0_plants_select ON public.plants;
CREATE POLICY p0_plants_select
  ON public.plants
  FOR SELECT
  TO authenticated
  USING (private.can_access_client_row(organization_id, client_id));

DROP POLICY IF EXISTS p0_devices_select ON public.devices;
CREATE POLICY p0_devices_select
  ON public.devices
  FOR SELECT
  TO authenticated
  USING (private.can_access_plant(plant_id));

DROP POLICY IF EXISTS p0_readings_select ON public.readings;
CREATE POLICY p0_readings_select
  ON public.readings
  FOR SELECT
  TO authenticated
  USING (private.can_access_plant(plant_id));

DROP POLICY IF EXISTS p0_alerts_select ON public.alerts;
CREATE POLICY p0_alerts_select
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (private.can_access_plant(plant_id));

DROP POLICY IF EXISTS p0_maintenance_tickets_select ON public.maintenance_tickets;
CREATE POLICY p0_maintenance_tickets_select
  ON public.maintenance_tickets
  FOR SELECT
  TO authenticated
  USING (private.can_access_plant(plant_id));

DROP POLICY IF EXISTS p0_maintenances_select ON public.maintenances;
CREATE POLICY p0_maintenances_select
  ON public.maintenances
  FOR SELECT
  TO authenticated
  USING (
    private.is_org_member(organization_id)
    OR private.can_access_plant(plant_id)
  );

DROP POLICY IF EXISTS p0_maintenances_update ON public.maintenances;
CREATE POLICY p0_maintenances_update
  ON public.maintenances
  FOR UPDATE
  TO authenticated
  USING (private.is_org_member(organization_id))
  WITH CHECK (private.is_org_member(organization_id));

DROP POLICY IF EXISTS p0_client_users_select ON public.client_users;
CREATE POLICY p0_client_users_select
  ON public.client_users
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR private.is_client_member(client_id)
    OR private.is_same_org((
      SELECT c.organization_id
      FROM public.clients c
      WHERE c.id = client_id
    ))
  );

DROP POLICY IF EXISTS p0_zones_select ON public.zones;
CREATE POLICY p0_zones_select
  ON public.zones
  FOR SELECT
  TO authenticated
  USING (private.can_access_zone(id));

GRANT SELECT ON TABLE public.clients TO authenticated;
GRANT SELECT ON TABLE public.client_users TO authenticated;
GRANT SELECT ON TABLE public.zones TO authenticated;
GRANT SELECT ON TABLE public.plants TO authenticated;
GRANT SELECT ON TABLE public.devices TO authenticated;
GRANT SELECT ON TABLE public.readings TO authenticated;
GRANT SELECT ON TABLE public.alerts TO authenticated;
GRANT SELECT ON TABLE public.maintenance_tickets TO authenticated;
GRANT SELECT ON TABLE public.maintenances TO authenticated;
GRANT UPDATE ON TABLE public.maintenances TO authenticated;
