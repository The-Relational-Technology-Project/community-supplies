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
  aiFeaturesEnabled: boolean;
  loading: boolean;
  notFound: boolean;
  isSlugRoute: boolean;
  /** True only when the resolved community came from the logged-in user's profile
   *  (not the Sunset fallback used for anonymous / no-profile cases). */
  hasProfileCommunity: boolean;
}

const CommunityContext = createContext<CommunityContextType>({
  communityId: DEFAULT_COMMUNITY_ID,
  communitySlug: DEFAULT_COMMUNITY_SLUG,
  communityName: DEFAULT_COMMUNITY_NAME,
  aiFeaturesEnabled: true,
  loading: false,
  notFound: false,
  isSlugRoute: false,
  hasProfileCommunity: false,
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
    aiFeaturesEnabled: true,
    loading: true,
    notFound: false,
    isSlugRoute: !!slug,
    hasProfileCommunity: false,
  });


  // Slug-driven resolution: independent of auth.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, slug, ai_features_enabled")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: slug,
          communityName: DEFAULT_COMMUNITY_NAME,
          aiFeaturesEnabled: true,
          loading: false,
          notFound: slug !== DEFAULT_COMMUNITY_SLUG,
          isSlugRoute: true,
          hasProfileCommunity: false,
        });
      } else {
        setCommunity({
          communityId: data.id,
          communitySlug: data.slug,
          communityName: data.name,
          aiFeaturesEnabled: (data as any).ai_features_enabled ?? true,
          loading: false,
          notFound: false,
          isSlugRoute: true,
          hasProfileCommunity: false,
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
        aiFeaturesEnabled: true,
        loading: false,
        notFound: false,
        isSlugRoute: false,
      });
      return;
    }

    setCommunity(prev => ({ ...prev, loading: true }));

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("community_id, communities!inner(id, name, slug, ai_features_enabled)")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const comm = (profile as any)?.communities;

      if (comm) {
        setCommunity({
          communityId: comm.id,
          communitySlug: comm.slug,
          communityName: comm.name,
          aiFeaturesEnabled: comm.ai_features_enabled ?? true,
          loading: false,
          notFound: false,
          isSlugRoute: false,
        });
      } else {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: DEFAULT_COMMUNITY_SLUG,
          communityName: DEFAULT_COMMUNITY_NAME,
          aiFeaturesEnabled: true,
          loading: false,
          notFound: false,
          isSlugRoute: false,
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
