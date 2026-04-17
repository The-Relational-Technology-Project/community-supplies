import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_COMMUNITY_ID = "a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4";
const DEFAULT_COMMUNITY_SLUG = "sunset-richmond";
const DEFAULT_COMMUNITY_NAME = "Sunset & Richmond SF";

interface CommunityContextType {
  communityId: string;
  communitySlug: string;
  communityName: string;
  loading: boolean;
  notFound: boolean;
}

const CommunityContext = createContext<CommunityContextType>({
  communityId: DEFAULT_COMMUNITY_ID,
  communitySlug: DEFAULT_COMMUNITY_SLUG,
  communityName: DEFAULT_COMMUNITY_NAME,
  loading: false,
  notFound: false,
});

export function useCommunity() {
  return useContext(CommunityContext);
}

interface CommunityProviderProps {
  children: ReactNode;
  slug?: string;
}

export function CommunityProvider({ children, slug }: CommunityProviderProps) {
  const { user, isReady } = useAuth();
  const [community, setCommunity] = useState<CommunityContextType>({
    communityId: DEFAULT_COMMUNITY_ID,
    communitySlug: slug || DEFAULT_COMMUNITY_SLUG,
    communityName: DEFAULT_COMMUNITY_NAME,
    loading: true,
    notFound: false,
  });

  // Slug-driven resolution: independent of auth.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    if (slug === DEFAULT_COMMUNITY_SLUG) {
      setCommunity({
        communityId: DEFAULT_COMMUNITY_ID,
        communitySlug: DEFAULT_COMMUNITY_SLUG,
        communityName: DEFAULT_COMMUNITY_NAME,
        loading: false,
        notFound: false,
      });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: slug,
          communityName: DEFAULT_COMMUNITY_NAME,
          loading: false,
          notFound: true,
        });
      } else {
        setCommunity({
          communityId: data.id,
          communitySlug: data.slug,
          communityName: data.name,
          loading: false,
          notFound: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  // Auth-driven resolution: only when no slug provided. Waits for auth bootstrap.
  useEffect(() => {
    if (slug) return;
    if (!isReady) return;

    let cancelled = false;

    if (!user) {
      setCommunity({
        communityId: DEFAULT_COMMUNITY_ID,
        communitySlug: DEFAULT_COMMUNITY_SLUG,
        communityName: DEFAULT_COMMUNITY_NAME,
        loading: false,
        notFound: false,
      });
      return;
    }

    setCommunity(prev => ({ ...prev, loading: true }));

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("community_id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const userCommunityId = profile?.community_id || DEFAULT_COMMUNITY_ID;

      const { data: comm } = await supabase
        .from("communities")
        .select("id, name, slug")
        .eq("id", userCommunityId)
        .maybeSingle();

      if (cancelled) return;

      if (comm) {
        setCommunity({
          communityId: comm.id,
          communitySlug: comm.slug,
          communityName: comm.name,
          loading: false,
          notFound: false,
        });
      } else {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: DEFAULT_COMMUNITY_SLUG,
          communityName: DEFAULT_COMMUNITY_NAME,
          loading: false,
          notFound: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [slug, isReady, user?.id]);

  return (
    <CommunityContext.Provider value={community}>
      {children}
    </CommunityContext.Provider>
  );
}
