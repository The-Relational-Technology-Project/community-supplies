ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS member_agreement text;
GRANT SELECT (member_agreement) ON public.communities TO anon, authenticated;
GRANT UPDATE (member_agreement) ON public.communities TO authenticated;
ALTER TABLE public.join_requests ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_member_agreement()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET agreement_accepted_at = now() WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.accept_member_agreement() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_member_agreement() TO authenticated;