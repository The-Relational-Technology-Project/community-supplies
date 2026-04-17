CREATE INDEX IF NOT EXISTS idx_supplies_community_id ON public.supplies(community_id);
CREATE INDEX IF NOT EXISTS idx_supplies_community_created ON public.supplies(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplies_owner_id ON public.supplies(owner_id);
CREATE INDEX IF NOT EXISTS idx_books_community_id ON public.books(community_id);
CREATE INDEX IF NOT EXISTS idx_books_owner_id ON public.books(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_community_id ON public.profiles(community_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);