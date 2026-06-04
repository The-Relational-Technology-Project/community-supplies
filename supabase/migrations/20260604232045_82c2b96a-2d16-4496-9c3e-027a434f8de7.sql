
-- Hot-path indexes
CREATE INDEX IF NOT EXISTS supplies_community_created_idx
  ON public.supplies (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS books_community_title_idx
  ON public.books (community_id, title ASC);
CREATE INDEX IF NOT EXISTS profiles_community_idx
  ON public.profiles (community_id);

-- Rewrite get_supplies_with_owners as PL/pgSQL: membership check once,
-- then a simple indexed scan. No per-row helper calls.
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
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Membership gate runs once.
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = v_uid
      AND profiles.community_id = p_community_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id, s.name, s.description, s.category, s.condition,
    s.party_types, s.date_available, s.location, s.neighborhood,
    s.cross_streets, s.contact_email, s.image_url, s.images,
    s.illustration_url, s.house_rules, s.owner_id, s.lent_out,
    s.lender_notes, s.created_at, s.updated_at,
    p.name AS owner_name, p.zip_code AS owner_zip_code
  FROM public.supplies s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  WHERE s.community_id = p_community_id
  ORDER BY s.created_at DESC;
END;
$$;

-- Same treatment for books.
CREATE OR REPLACE FUNCTION public.get_books_with_owners(
  p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
)
RETURNS TABLE(
  id uuid, title text, author text, genre text, condition text,
  house_rules text[], owner_id uuid, lent_out boolean, lender_notes text,
  created_at timestamp with time zone, updated_at timestamp with time zone,
  owner_name text, owner_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = v_uid
      AND profiles.community_id = p_community_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.title, b.author, b.genre, b.condition,
    b.house_rules, b.owner_id, b.lent_out, b.lender_notes,
    b.created_at, b.updated_at,
    p.name AS owner_name, p.email AS owner_email
  FROM public.books b
  LEFT JOIN public.profiles p ON p.id = b.owner_id
  WHERE b.community_id = p_community_id
  ORDER BY b.title ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplies_with_owners(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_books_with_owners(uuid) TO authenticated, anon;
