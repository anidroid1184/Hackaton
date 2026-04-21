-- organizations + profiles bootstrap (transaction-friendly; runner may wrap in a single transaction)


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'client', 'technician')),
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_organization_id_idx ON public.profiles (organization_id);

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.organizations (name, slug)
VALUES ('Default', 'default');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, organization_id, role)
  VALUES (
    NEW.id,
    (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1),
    'client'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_authenticated"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.organizations TO postgres, service_role;
GRANT SELECT ON TABLE public.organizations TO authenticated;

GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
