ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS ai_features_enabled boolean NOT NULL DEFAULT true;