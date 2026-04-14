
ALTER TABLE public.community_steward_requests
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS community_name text,
ADD COLUMN IF NOT EXISTS community_slug text;
