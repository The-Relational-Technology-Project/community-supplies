CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.internal_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_secrets TO service_role;
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have no grants and no policy, so this table is
-- reachable only by the service role (edge functions) and superuser jobs.

INSERT INTO public.internal_secrets (key, value)
VALUES ('request_digest_cron_token', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_request_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT value INTO v_token FROM public.internal_secrets WHERE key = 'request_digest_cron_token';
  PERFORM net.http_post(
    url := 'https://mbmmfgivhqzhjyneyelu.supabase.co/functions/v1/send-request-digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_token),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_request_digest() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('weekly-request-digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-request-digest');

SELECT cron.schedule(
  'weekly-request-digest',
  '0 16 * * 1',
  $$SELECT public.run_request_digest();$$
);