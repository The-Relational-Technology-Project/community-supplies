
-- Restrict anon's column-level access on public.communities so that
-- precise location columns (latitude, longitude, zip_code) are no longer
-- readable without authentication. Signed-in users (authenticated) keep
-- full SELECT access, which preserves the steward dashboard and the
-- existing get_discoverable_communities RPC.

REVOKE SELECT ON public.communities FROM anon;

GRANT SELECT (
  id,
  name,
  slug,
  description,
  created_at,
  updated_at,
  join_mode,
  discoverable,
  country_code,
  public_location_label,
  coarse_latitude,
  coarse_longitude,
  intl_label,
  ai_features_enabled
) ON public.communities TO anon;
