-- Add join_mode column to communities
ALTER TABLE public.communities ADD COLUMN join_mode text NOT NULL DEFAULT 'auto';

-- Add 'approved' value to the join_request_status enum
ALTER TYPE public.join_request_status ADD VALUE IF NOT EXISTS 'approved';

-- Update handle_new_user() to check community join_mode
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_community_id uuid;
  v_join_mode text;
BEGIN
  v_community_id := COALESCE(
    (NEW.raw_user_meta_data->>'community_id')::uuid,
    'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
  );

  SELECT join_mode INTO v_join_mode FROM public.communities WHERE id = v_community_id;

  INSERT INTO public.profiles (id, name, email, vouched_at, intro_text, zip_code, community_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE WHEN v_join_mode = 'approval_required' THEN null ELSE now() END,
    NEW.raw_user_meta_data->>'connection_context',
    NEW.raw_user_meta_data->>'zip_code',
    v_community_id
  );
  RETURN NEW;
END;
$$;