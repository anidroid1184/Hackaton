-- p0 migration core: domain tables and minimal indexes (idempotent, no RLS here)

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  tariff_cop_per_kwh numeric(14, 6) NOT NULL,
  currency text NOT NULL DEFAULT 'COP',
  grid_emission_factor_kg_co2_per_kwh numeric(14, 8) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  geozone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, geozone)
);

CREATE TABLE IF NOT EXISTS public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.zones (id) ON DELETE SET NULL,
  name text NOT NULL,
  address_line text,
  nominal_power_kw numeric(12, 4),
  timezone text NOT NULL DEFAULT 'America/Bogota',
  lat double precision,
  lng double precision,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'degraded', 'offline', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants (id) ON DELETE CASCADE,
  vendor_slug text NOT NULL,
  external_device_id text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, vendor_slug, external_device_id)
);

CREATE TABLE IF NOT EXISTS public.readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants (id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices (id) ON DELETE SET NULL,
  ts timestamptz NOT NULL,
  raw jsonb,
  canonical jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants (id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.devices (id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('arc_fault', 'breaker_fatigue', 'degradation', 'offline', 'out_of_range')),
  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  ts timestamptz NOT NULL,
  payload jsonb,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants (id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'done', 'overdue')),
  due_at timestamptz,
  completed_at timestamptz,
  assigned_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants (id) ON DELETE CASCADE,
  maintenance_ticket_id uuid REFERENCES public.maintenance_tickets (id) ON DELETE SET NULL,
  assigned_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  last_maintenance_at timestamptz,
  next_scheduled_at timestamptz,
  problem_summary text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.maintenances
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS checklist jsonb,
  ADD COLUMN IF NOT EXISTS evidence jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE INDEX IF NOT EXISTS readings_plant_id_ts_desc_idx ON public.readings (plant_id, ts DESC);
CREATE INDEX IF NOT EXISTS alerts_plant_id_ts_desc_idx ON public.alerts (plant_id, ts DESC);
CREATE INDEX IF NOT EXISTS plants_organization_id_zone_id_idx ON public.plants (organization_id, zone_id);
CREATE INDEX IF NOT EXISTS maintenances_org_plant_next_sched_idx ON public.maintenances (organization_id, plant_id, next_scheduled_at);
CREATE INDEX IF NOT EXISTS maintenances_org_assignee_next_sched_idx ON public.maintenances (organization_id, assigned_profile_id, next_scheduled_at);
CREATE INDEX IF NOT EXISTS maintenances_org_status_next_sched_idx ON public.maintenances (organization_id, status, next_scheduled_at);

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS client_users_set_updated_at ON public.client_users;
CREATE TRIGGER client_users_set_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS zones_set_updated_at ON public.zones;
CREATE TRIGGER zones_set_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS plants_set_updated_at ON public.plants;
CREATE TRIGGER plants_set_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS devices_set_updated_at ON public.devices;
CREATE TRIGGER devices_set_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS maintenance_tickets_set_updated_at ON public.maintenance_tickets;
CREATE TRIGGER maintenance_tickets_set_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS maintenances_set_updated_at ON public.maintenances;
CREATE TRIGGER maintenances_set_updated_at
  BEFORE UPDATE ON public.maintenances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
