-- 1. New columns on communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS public_location_label text,
  ADD COLUMN IF NOT EXISTS coarse_latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS coarse_longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS intl_label text;

-- 2. Tighten update policy: steward AND member of the community
DROP POLICY IF EXISTS "Stewards can update communities" ON public.communities;
CREATE POLICY "Stewards can update own community"
  ON public.communities
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'steward'::app_role) AND user_in_community(auth.uid(), id))
  WITH CHECK (has_role(auth.uid(), 'steward'::app_role) AND user_in_community(auth.uid(), id));

-- 3. city_centroids lookup table (US cities)
CREATE TABLE IF NOT EXISTS public.city_centroids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_normalized text NOT NULL,
  state_code text NOT NULL,
  city_display text NOT NULL,
  latitude numeric(9,6) NOT NULL,
  longitude numeric(9,6) NOT NULL,
  UNIQUE (city_normalized, state_code)
);

CREATE INDEX IF NOT EXISTS idx_city_centroids_lookup
  ON public.city_centroids (city_normalized, state_code);

ALTER TABLE public.city_centroids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read city centroids"
  ON public.city_centroids
  FOR SELECT
  USING (true);

-- 4. Public RPC: named pins (opted in)
CREATE OR REPLACE FUNCTION public.get_discoverable_communities()
RETURNS TABLE(slug text, name text, public_location_label text,
              latitude numeric, longitude numeric, join_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug, name, public_location_label, latitude, longitude, join_mode
  FROM public.communities
  WHERE discoverable = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  LIMIT 500;
$$;

-- 5. Public RPC: anonymous pins (no identity, only coordinates)
CREATE OR REPLACE FUNCTION public.get_anonymous_pins()
RETURNS TABLE(lat numeric, lng numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coarse_latitude, coarse_longitude
  FROM public.communities
  WHERE coarse_latitude IS NOT NULL
    AND coarse_longitude IS NOT NULL
    AND discoverable = false
  LIMIT 500;
$$;

-- 6. Public RPC: international labels (sidebar)
CREATE OR REPLACE FUNCTION public.get_intl_communities()
RETURNS TABLE(intl_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT intl_label
  FROM public.communities
  WHERE intl_label IS NOT NULL
  ORDER BY intl_label
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_discoverable_communities() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_anonymous_pins() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_intl_communities() TO anon, authenticated;