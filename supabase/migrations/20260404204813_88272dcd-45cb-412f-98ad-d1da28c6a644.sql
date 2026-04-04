CREATE TABLE public.community_neighbors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  search_endpoint text NOT NULL,
  join_url text NOT NULL,
  federation_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_neighbors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stewards can manage neighbors"
  ON public.community_neighbors FOR ALL
  TO authenticated
  USING (is_user_steward(auth.uid()))
  WITH CHECK (is_user_steward(auth.uid()));

CREATE POLICY "Authenticated users can read neighbors"
  ON public.community_neighbors FOR SELECT
  TO authenticated
  USING (true);