-- Extend profile roles to 4 canonical app roles (client, operations, corporate, technician).

-- Migrate any legacy 'admin' row to 'operations' before swapping the CHECK.
UPDATE public.profiles SET role = 'operations' WHERE role = 'admin';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'operations', 'corporate', 'technician'));

-- Trigger now honors metadata.role when Admin API provides it; defaults to 'client'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
  meta_org_slug text;
  resolved_org uuid;
BEGIN
  meta_role := NULLIF(NEW.raw_user_meta_data ->> 'role', '');
  meta_org_slug := NULLIF(NEW.raw_user_meta_data ->> 'organization_slug', '');

  IF meta_role IS NULL OR meta_role NOT IN ('client', 'operations', 'corporate', 'technician') THEN
    meta_role := 'client';
  END IF;

  IF meta_org_slug IS NOT NULL THEN
    SELECT id INTO resolved_org FROM public.organizations WHERE slug = meta_org_slug LIMIT 1;
  END IF;

  IF resolved_org IS NULL THEN
    SELECT id INTO resolved_org FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, organization_id, role, full_name)
  VALUES (
    NEW.id,
    resolved_org,
    meta_role,
    NULLIF(NEW.raw_user_meta_data ->> 'display_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;
