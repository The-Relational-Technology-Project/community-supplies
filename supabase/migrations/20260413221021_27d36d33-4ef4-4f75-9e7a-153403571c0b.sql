
-- 1. Create communities table
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Stewards can insert communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'steward'::app_role));
CREATE POLICY "Stewards can update communities" ON public.communities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'steward'::app_role));

CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Insert the default community
INSERT INTO public.communities (id, name, slug, description)
VALUES ('a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4', 'Sunset & Richmond SF', 'sunset-richmond', 'The original Community Supplies sharing community in San Francisco''s Sunset and Richmond districts.');

-- 3. Add community_id columns with default pointing to the existing community
ALTER TABLE public.supplies ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';
ALTER TABLE public.books ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';
ALTER TABLE public.profiles ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';
ALTER TABLE public.join_requests ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';
ALTER TABLE public.user_roles ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';
ALTER TABLE public.supply_requests ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4';

-- 4. Backfill all existing rows
UPDATE public.supplies SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;
UPDATE public.books SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;
UPDATE public.profiles SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;
UPDATE public.join_requests SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;
UPDATE public.user_roles SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;
UPDATE public.supply_requests SET community_id = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4' WHERE community_id IS NULL;

-- Make community_id NOT NULL after backfill
ALTER TABLE public.supplies ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE public.books ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE public.join_requests ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE public.supply_requests ALTER COLUMN community_id SET NOT NULL;

-- 5. Add indexes for community_id
CREATE INDEX idx_supplies_community_id ON public.supplies(community_id);
CREATE INDEX idx_books_community_id ON public.books(community_id);
CREATE INDEX idx_profiles_community_id ON public.profiles(community_id);
CREATE INDEX idx_join_requests_community_id ON public.join_requests(community_id);
CREATE INDEX idx_user_roles_community_id ON public.user_roles(community_id);
CREATE INDEX idx_supply_requests_community_id ON public.supply_requests(community_id);

-- 6. Helper function: get a user's community_id
CREATE OR REPLACE FUNCTION public.get_user_community_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT community_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- 7. Helper: check if user belongs to a community
CREATE OR REPLACE FUNCTION public.user_in_community(p_user_id uuid, p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND community_id = p_community_id
  );
$$;

-- 8. Update RLS policies on supplies
DROP POLICY IF EXISTS "Vouched members can view all supplies" ON public.supplies;
CREATE POLICY "Vouched members can view community supplies" ON public.supplies
  FOR SELECT USING (
    is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own supplies" ON public.supplies;
CREATE POLICY "Users can insert their own supplies" ON public.supplies
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own supplies" ON public.supplies;
CREATE POLICY "Users can update their own supplies" ON public.supplies
  FOR UPDATE USING (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own supplies" ON public.supplies;
CREATE POLICY "Users can delete their own supplies" ON public.supplies
  FOR DELETE USING (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

-- 9. Update RLS on books
DROP POLICY IF EXISTS "Vouched members can view all books" ON public.books;
CREATE POLICY "Vouched members can view community books" ON public.books
  FOR SELECT USING (
    is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Vouched owners can insert their own books" ON public.books;
CREATE POLICY "Vouched owners can insert their own books" ON public.books
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Vouched owners can update their own books" ON public.books;
CREATE POLICY "Vouched owners can update their own books" ON public.books
  FOR UPDATE USING (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Vouched owners can delete their own books" ON public.books;
CREATE POLICY "Vouched owners can delete their own books" ON public.books
  FOR DELETE USING (
    auth.uid() = owner_id AND is_user_vouched(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

-- 10. Update RLS on join_requests
DROP POLICY IF EXISTS "Rate limited join request submissions" ON public.join_requests;
CREATE POLICY "Rate limited join request submissions" ON public.join_requests
  FOR INSERT WITH CHECK (check_join_request_rate_limit(email));

DROP POLICY IF EXISTS "Stewards can view all join requests" ON public.join_requests;
CREATE POLICY "Stewards can view community join requests" ON public.join_requests
  FOR SELECT USING (
    is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Stewards can vouch via join requests" ON public.join_requests;
CREATE POLICY "Stewards can vouch community join requests" ON public.join_requests
  FOR UPDATE USING (
    is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

-- Keep user's own view
DROP POLICY IF EXISTS "Users can view their own join request" ON public.join_requests;
CREATE POLICY "Users can view their own join request" ON public.join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- 11. Update RLS on supply_requests
DROP POLICY IF EXISTS "Stewards can view all supply requests" ON public.supply_requests;
CREATE POLICY "Stewards can view community supply requests" ON public.supply_requests
  FOR SELECT USING (
    is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Supply owners can view requests for their supplies" ON public.supply_requests;
CREATE POLICY "Supply owners can view requests for their supplies" ON public.supply_requests
  FOR SELECT USING (auth.uid() = supply_owner_id);

DROP POLICY IF EXISTS "Authenticated users can create supply requests" ON public.supply_requests;
CREATE POLICY "Authenticated users can create supply requests" ON public.supply_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 12. Update RLS on user_roles  
DROP POLICY IF EXISTS "Stewards can manage roles" ON public.user_roles;
CREATE POLICY "Stewards can manage community roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'steward'::app_role) AND community_id = get_user_community_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'steward'::app_role) AND community_id = get_user_community_id(auth.uid()));

DROP POLICY IF EXISTS "Stewards can view all roles" ON public.user_roles;
CREATE POLICY "Stewards can view community roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'steward'::app_role) AND community_id = get_user_community_id(auth.uid()));

-- Keep user's own view
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 13. Update RLS on profiles — stewards see their community
DROP POLICY IF EXISTS "Stewards can view all profiles" ON public.profiles;
CREATE POLICY "Stewards can view community profiles" ON public.profiles
  FOR SELECT USING (
    is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

DROP POLICY IF EXISTS "Stewards can update member vouching status" ON public.profiles;
CREATE POLICY "Stewards can update community member vouching" ON public.profiles
  FOR UPDATE USING (
    is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid())
  );

-- 14. Update RPCs to accept community_id parameter
CREATE OR REPLACE FUNCTION public.get_supplies_with_owners(p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4')
RETURNS TABLE(
  id uuid, name text, description text, category text, condition text,
  party_types text[], date_available date, location text, neighborhood text,
  cross_streets text, contact_email text, image_url text, images text[],
  illustration_url text, house_rules text[], owner_id uuid, lent_out boolean,
  lender_notes text, created_at timestamp with time zone, updated_at timestamp with time zone,
  owner_name text, owner_zip_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    s.id, s.name, s.description, s.category, s.condition,
    s.party_types, s.date_available, s.location, s.neighborhood,
    s.cross_streets, s.contact_email, s.image_url, s.images,
    s.illustration_url, s.house_rules, s.owner_id, s.lent_out,
    s.lender_notes, s.created_at, s.updated_at,
    p.name as owner_name, p.zip_code as owner_zip_code
  FROM public.supplies s
  LEFT JOIN public.profiles p ON s.owner_id = p.id
  WHERE is_user_vouched(auth.uid())
    AND s.community_id = p_community_id
    AND (p.vouched_at IS NOT NULL OR p.id IS NULL)
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_books_with_owners(p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4')
RETURNS TABLE(
  id uuid, title text, author text, genre text, condition text,
  house_rules text[], owner_id uuid, lent_out boolean, lender_notes text,
  created_at timestamp with time zone, updated_at timestamp with time zone,
  owner_name text, owner_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    b.id, b.title, b.author, b.genre, b.condition,
    b.house_rules, b.owner_id, b.lent_out, b.lender_notes,
    b.created_at, b.updated_at,
    p.name as owner_name, p.email as owner_email
  FROM public.books b
  LEFT JOIN public.profiles p ON b.owner_id = p.id
  WHERE is_user_vouched(auth.uid())
    AND b.community_id = p_community_id
    AND (p.vouched_at IS NOT NULL OR p.id IS NULL)
  ORDER BY b.title ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_illustrations(p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4')
RETURNS TABLE(illustration_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT s.illustration_url
  FROM public.supplies s
  WHERE s.illustration_url IS NOT NULL
    AND s.community_id = p_community_id
  ORDER BY random()
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.search_supplies_public(search_query text, p_community_id uuid DEFAULT 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4')
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT count(*)::integer
  FROM public.supplies
  WHERE lent_out = false
    AND community_id = p_community_id
    AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('english', search_query);
$$;

-- 15. Update handle_new_user to set community_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, vouched_at, intro_text, zip_code, community_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    now(),
    NEW.raw_user_meta_data->>'connection_context',
    NEW.raw_user_meta_data->>'zip_code',
    COALESCE(
      (NEW.raw_user_meta_data->>'community_id')::uuid,
      'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
    )
  );
  RETURN NEW;
END;
$$;

-- 16. Update handle_new_user_role to set community_id
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, community_id)
  VALUES (
    NEW.id,
    'member'::app_role,
    COALESCE(
      (NEW.raw_user_meta_data->>'community_id')::uuid,
      'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
    )
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
