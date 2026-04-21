-- Seed P0: demo tenant data with strict organization separation (idempotent).
-- Identity rule: all isolation is by organization_id (application tenant), not provider IDs.

INSERT INTO public.organizations (name, slug)
VALUES
  ('Default', 'default'),
  ('Techos Rentables Demo', 'tr-demo')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO public.clients (
  id,
  organization_id,
  name,
  tariff_cop_per_kwh,
  currency,
  grid_emission_factor_kg_co2_per_kwh
)
SELECT
  '10000000-0000-0000-0000-000000000001'::uuid,
  o.id,
  'Cliente Demo Default',
  820.000000,
  'COP',
  0.00043000
FROM public.organizations o
WHERE o.slug = 'default'
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  tariff_cop_per_kwh = EXCLUDED.tariff_cop_per_kwh,
  currency = EXCLUDED.currency,
  grid_emission_factor_kg_co2_per_kwh = EXCLUDED.grid_emission_factor_kg_co2_per_kwh;

INSERT INTO public.clients (
  id,
  organization_id,
  name,
  tariff_cop_per_kwh,
  currency,
  grid_emission_factor_kg_co2_per_kwh
)
SELECT
  '20000000-0000-0000-0000-000000000001'::uuid,
  o.id,
  'Alimentos Andina',
  910.000000,
  'COP',
  0.00043000
FROM public.organizations o
WHERE o.slug = 'tr-demo'
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  tariff_cop_per_kwh = EXCLUDED.tariff_cop_per_kwh,
  currency = EXCLUDED.currency,
  grid_emission_factor_kg_co2_per_kwh = EXCLUDED.grid_emission_factor_kg_co2_per_kwh;

INSERT INTO public.zones (id, organization_id, name, geozone)
SELECT
  '30000000-0000-0000-0000-000000000001'::uuid,
  o.id,
  'Zona Norte Demo',
  'zona-norte'
FROM public.organizations o
WHERE o.slug = 'default'
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  geozone = EXCLUDED.geozone;

INSERT INTO public.zones (id, organization_id, name, geozone)
SELECT
  '40000000-0000-0000-0000-000000000001'::uuid,
  o.id,
  'Zona Sur TR',
  'zona-sur'
FROM public.organizations o
WHERE o.slug = 'tr-demo'
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  geozone = EXCLUDED.geozone;

INSERT INTO public.plants (
  id,
  organization_id,
  client_id,
  zone_id,
  name,
  address_line,
  nominal_power_kw,
  timezone,
  status
)
SELECT
  '50000000-0000-0000-0000-000000000001'::uuid,
  c.organization_id,
  c.id,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'Planta Demo Norte',
  'Calle 120 #18-44, Bogota',
  120.5000,
  'America/Bogota',
  'online'
FROM public.clients c
WHERE c.id = '10000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  client_id = EXCLUDED.client_id,
  zone_id = EXCLUDED.zone_id,
  name = EXCLUDED.name,
  address_line = EXCLUDED.address_line,
  nominal_power_kw = EXCLUDED.nominal_power_kw,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status;

INSERT INTO public.plants (
  id,
  organization_id,
  client_id,
  zone_id,
  name,
  address_line,
  nominal_power_kw,
  timezone,
  status
)
SELECT
  '60000000-0000-0000-0000-000000000001'::uuid,
  c.organization_id,
  c.id,
  '40000000-0000-0000-0000-000000000001'::uuid,
  'Planta TR Sur',
  'Carrera 49 #7-20, Cali',
  140.2500,
  'America/Bogota',
  'degraded'
FROM public.clients c
WHERE c.id = '20000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  client_id = EXCLUDED.client_id,
  zone_id = EXCLUDED.zone_id,
  name = EXCLUDED.name,
  address_line = EXCLUDED.address_line,
  nominal_power_kw = EXCLUDED.nominal_power_kw,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status;

INSERT INTO public.devices (id, plant_id, vendor_slug, external_device_id, meta)
VALUES
  (
    '70000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    'deye',
    'DEYE-INV-001',
    '{"provider":"deye","profile":"default"}'::jsonb
  ),
  (
    '80000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000001'::uuid,
    'huawei',
    'HUAWEI-INV-002',
    '{"provider":"huawei","profile":"tr-demo"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET
  plant_id = EXCLUDED.plant_id,
  vendor_slug = EXCLUDED.vendor_slug,
  external_device_id = EXCLUDED.external_device_id,
  meta = EXCLUDED.meta;

INSERT INTO public.readings (id, plant_id, device_id, ts, raw, canonical)
VALUES
  (
    '90000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    '70000000-0000-0000-0000-000000000001'::uuid,
    '2026-04-18T10:00:00Z'::timestamptz,
    '{"value":228.4,"unit":"V"}'::jsonb,
    '{"p_active_kw":42.1,"pf":0.96}'::jsonb
  ),
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000001'::uuid,
    '80000000-0000-0000-0000-000000000001'::uuid,
    '2026-04-18T10:05:00Z'::timestamptz,
    '{"value":214.8,"unit":"V"}'::jsonb,
    '{"p_active_kw":37.4,"pf":0.89}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET
  plant_id = EXCLUDED.plant_id,
  device_id = EXCLUDED.device_id,
  ts = EXCLUDED.ts,
  raw = EXCLUDED.raw,
  canonical = EXCLUDED.canonical;

INSERT INTO public.alerts (id, plant_id, device_id, type, severity, ts, payload)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    '70000000-0000-0000-0000-000000000001'::uuid,
    'arc_fault',
    'critical',
    '2026-04-18T10:04:00Z'::timestamptz,
    '{"summary":"Arco electrico detectado","source":"seed"}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000001'::uuid,
    '80000000-0000-0000-0000-000000000001'::uuid,
    'degradation',
    'warn',
    '2026-04-18T10:08:00Z'::timestamptz,
    '{"summary":"Degradacion de rendimiento","source":"seed"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET
  plant_id = EXCLUDED.plant_id,
  device_id = EXCLUDED.device_id,
  type = EXCLUDED.type,
  severity = EXCLUDED.severity,
  ts = EXCLUDED.ts,
  payload = EXCLUDED.payload;

INSERT INTO public.maintenance_tickets (
  id,
  plant_id,
  title,
  status,
  due_at,
  assigned_profile_id
)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    'Revision de string S2',
    'pending',
    '2026-04-20T14:00:00Z'::timestamptz,
    NULL
  ),
  (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000001'::uuid,
    'Termografia breaker principal',
    'pending',
    '2026-04-24T10:00:00Z'::timestamptz,
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  plant_id = EXCLUDED.plant_id,
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  due_at = EXCLUDED.due_at,
  assigned_profile_id = EXCLUDED.assigned_profile_id;

INSERT INTO public.maintenances (
  id,
  organization_id,
  plant_id,
  maintenance_ticket_id,
  assigned_profile_id,
  last_maintenance_at,
  next_scheduled_at,
  problem_summary,
  status,
  completed_at
)
SELECT
  'f0000000-0000-0000-0000-000000000001'::uuid,
  p.organization_id,
  p.id,
  'd0000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  '2026-04-04T09:00:00Z'::timestamptz,
  '2026-04-20T14:00:00Z'::timestamptz,
  'Arco electrico recurrente en string S2',
  'scheduled',
  NULL
FROM public.plants p
WHERE p.id = '50000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  plant_id = EXCLUDED.plant_id,
  maintenance_ticket_id = EXCLUDED.maintenance_ticket_id,
  assigned_profile_id = EXCLUDED.assigned_profile_id,
  last_maintenance_at = EXCLUDED.last_maintenance_at,
  next_scheduled_at = EXCLUDED.next_scheduled_at,
  problem_summary = EXCLUDED.problem_summary,
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at;

INSERT INTO public.maintenances (
  id,
  organization_id,
  plant_id,
  maintenance_ticket_id,
  assigned_profile_id,
  last_maintenance_at,
  next_scheduled_at,
  problem_summary,
  status,
  completed_at
)
SELECT
  '11000000-0000-0000-0000-000000000001'::uuid,
  p.organization_id,
  p.id,
  'e0000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  '2026-04-10T11:30:00Z'::timestamptz,
  '2026-04-24T10:00:00Z'::timestamptz,
  'Inspeccion termografica y fatiga de breaker',
  'scheduled',
  NULL
FROM public.plants p
WHERE p.id = '60000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  plant_id = EXCLUDED.plant_id,
  maintenance_ticket_id = EXCLUDED.maintenance_ticket_id,
  assigned_profile_id = EXCLUDED.assigned_profile_id,
  last_maintenance_at = EXCLUDED.last_maintenance_at,
  next_scheduled_at = EXCLUDED.next_scheduled_at,
  problem_summary = EXCLUDED.problem_summary,
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at;

-- Link one existing client profile (if present) to each seeded client for RLS client-member tests.
INSERT INTO public.client_users (client_id, profile_id)
SELECT
  c.id,
  p.id
FROM public.clients c
JOIN public.profiles p
  ON p.organization_id = c.organization_id
WHERE c.id IN (
  '10000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid
)
  AND p.role = 'client'
ON CONFLICT (client_id, profile_id) DO NOTHING;
