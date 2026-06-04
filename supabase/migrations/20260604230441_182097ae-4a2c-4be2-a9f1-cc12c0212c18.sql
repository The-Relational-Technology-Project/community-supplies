
-- Drop legacy zero-arg overload that causes PostgREST ambiguity → 520 errors
DROP FUNCTION IF EXISTS public.get_supplies_with_owners();
DROP FUNCTION IF EXISTS public.get_books_with_owners();

-- Recreate the community-scoped supplies RPC without stale vouching filters.
-- Membership check replaces is_user_vouched / vouched_at predicates.
CREATE OR REPLACE FUNCTION public.get_supplies_with_owners(
  p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
)
RETURNS TABLE(
  id uuid, name text, description text, category text, condition text,
  party_types text[], date_available date, location text, neighborhood text,
  cross_streets text, contact_email text, image_url text, images text[],
  illustration_url text, house_rules text[], owner_id uuid, lent_out boolean,
  lender_notes text, created_at timestamp with time zone,
  updated_at timestamp with time zone, owner_name text, owner_zip_code text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.name, s.description, s.category, s.condition,
    s.party_types, s.date_available, s.location, s.neighborhood,
    s.cross_streets, s.contact_email, s.image_url, s.images,
    s.illustration_url, s.house_rules, s.owner_id, s.lent_out,
    s.lender_notes, s.created_at, s.updated_at,
    p.name as owner_name, p.zip_code as owner_zip_code
  FROM public.supplies s
  LEFT JOIN public.profiles p ON s.owner_id = p.id
  WHERE s.community_id = p_community_id
    AND public.user_in_community(auth.uid(), p_community_id)
  ORDER BY s.created_at DESC;
$function$;

-- Same treatment for the books RPC.
CREATE OR REPLACE FUNCTION public.get_books_with_owners(
  p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
)
RETURNS TABLE(
  id uuid, title text, author text, genre text, condition text,
  house_rules text[], owner_id uuid, lent_out boolean, lender_notes text,
  created_at timestamp with time zone, updated_at timestamp with time zone,
  owner_name text, owner_email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    b.id, b.title, b.author, b.genre, b.condition,
    b.house_rules, b.owner_id, b.lent_out, b.lender_notes,
    b.created_at, b.updated_at,
    p.name as owner_name, p.email as owner_email
  FROM public.books b
  LEFT JOIN public.profiles p ON b.owner_id = p.id
  WHERE b.community_id = p_community_id
    AND public.user_in_community(auth.uid(), p_community_id)
  ORDER BY b.title ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_supplies_with_owners(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_books_with_owners(uuid) TO authenticated, anon;
