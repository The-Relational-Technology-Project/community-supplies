
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE public.membership_status AS ENUM ('pending', 'active', 'deactivated', 'rejected');
  END IF;
END$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_status public.membership_status NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.sync_vouched_at_from_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_status = 'active' THEN
    NEW.vouched_at := COALESCE(NEW.vouched_at, now());
  ELSE
    NEW.vouched_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vouched_at ON public.profiles;
CREATE TRIGGER trg_sync_vouched_at
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vouched_at_from_status();

UPDATE public.profiles
   SET membership_status = 'active'
 WHERE vouched_at IS NOT NULL;

UPDATE public.profiles p
   SET membership_status = 'deactivated'
 WHERE p.vouched_at IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.join_requests jr
      WHERE jr.user_id = p.id
        AND jr.community_id = p.community_id
        AND jr.status = 'pending'
   );

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

  INSERT INTO public.profiles (id, name, email, membership_status, intro_text, zip_code, community_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE WHEN v_join_mode = 'approval_required'
         THEN 'pending'::public.membership_status
         ELSE 'active'::public.membership_status END,
    NEW.raw_user_meta_data->>'connection_context',
    NEW.raw_user_meta_data->>'zip_code',
    v_community_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.switch_user_community(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_join_mode text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT join_mode INTO v_join_mode FROM public.communities WHERE id = p_community_id;
  IF v_join_mode IS NULL THEN RAISE EXCEPTION 'community not found'; END IF;
  IF v_join_mode <> 'auto' THEN RAISE EXCEPTION 'community requires approval'; END IF;

  UPDATE public.profiles
     SET community_id = p_community_id,
         membership_status = 'active'
   WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_user_community(uuid) TO authenticated;
