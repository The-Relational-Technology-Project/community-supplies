-- Audit fix #5a: drop the Sunset-flagship DEFAULT on the remaining tenant
-- tables. profiles already had its default dropped (20260611170031). With these
-- gone, any insert that forgets community_id fails loudly (NOT NULL violation)
-- instead of silently landing rows in the Sunset & Richmond flagship community
-- ('a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'). The columns stay NOT NULL.
--
-- Verified every insert path supplies community_id explicitly:
--   supplies        — AddSupply.tsx, BulkAddSupplies.tsx
--   books           — useBooks.addBooks
--   join_requests   — the unified join helper (src/lib/joinCommunity.ts) and
--                     JoinRequestForm; the dead AuthModal join-request path is
--                     removed in the same change
--   supply_requests — send-contact-message (ContactModal + BookContactModal now
--                     both pass communityId)
--   user_roles      — handle_new_user_role trigger (always coalesces a value),
--                     create-community, bulk-create-users

ALTER TABLE public.supplies        ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.books           ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.supply_requests ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.join_requests   ALTER COLUMN community_id DROP DEFAULT;
ALTER TABLE public.user_roles      ALTER COLUMN community_id DROP DEFAULT;
