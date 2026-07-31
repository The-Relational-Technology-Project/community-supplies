-- Column-level read access: keep precise latitude/longitude/zip_code private.
REVOKE SELECT ON public.communities FROM anon, authenticated;

GRANT SELECT (
  id, name, slug, description, created_at, updated_at,
  join_mode, discoverable, country_code,
  public_location_label, coarse_latitude, coarse_longitude,
  intl_label, ai_features_enabled, custom_join_question
) ON public.communities TO anon, authenticated;

GRANT ALL ON public.communities TO service_role;

-- Stewards need the precise coordinates for their own community's settings.
CREATE OR REPLACE FUNCTION public.get_my_community_location(p_community_id uuid)
RETURNS TABLE(
  discoverable boolean,
  latitude numeric,
  longitude numeric,
  coarse_latitude numeric,
  coarse_longitude numeric,
  public_location_label text,
  join_mode text,
  zip_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.discoverable, c.latitude, c.longitude,
         c.coarse_latitude, c.coarse_longitude,
         c.public_location_label, c.join_mode, c.zip_code
  FROM public.communities c
  WHERE c.id = p_community_id
    AND public.is_steward_of(auth.uid(), c.id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_community_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_community_location(uuid) TO authenticated;