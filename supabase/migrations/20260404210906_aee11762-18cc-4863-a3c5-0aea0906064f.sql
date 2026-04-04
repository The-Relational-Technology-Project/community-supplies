-- GIN index for full-text search performance
CREATE INDEX idx_supplies_fts ON public.supplies
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Security definer function callable by service role from the edge function
CREATE OR REPLACE FUNCTION public.search_supplies_public(search_query text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT count(*)::integer
  FROM public.supplies
  WHERE lent_out = false
    AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('english', search_query);
$$;