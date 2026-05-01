CREATE OR REPLACE FUNCTION public.get_community_public_stats(p_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  public_location_label text,
  join_mode text,
  discoverable boolean,
  member_count bigint,
  supply_count bigint,
  book_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.public_location_label,
    c.join_mode,
    c.discoverable,
    (SELECT count(*) FROM public.profiles p WHERE p.community_id = c.id AND p.vouched_at IS NOT NULL),
    (SELECT count(*) FROM public.supplies s WHERE s.community_id = c.id),
    (SELECT count(*) FROM public.books b WHERE b.community_id = c.id)
  FROM public.communities c
  WHERE c.slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_public_stats(text) TO anon, authenticated;