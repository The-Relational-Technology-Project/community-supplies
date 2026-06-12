
ALTER TABLE public.supplies        ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.books           ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.supply_requests ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.join_requests   ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.user_roles      ALTER COLUMN community_id DROP DEFAULT;
