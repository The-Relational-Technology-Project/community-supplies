import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [community, setCommunity] = useState<CommunityContextType>({
    communityId: DEFAULT_COMMUNITY_ID,
    communitySlug: slug || DEFAULT_COMMUNITY_SLUG,
    communityName: DEFAULT_COMMUNITY_NAME,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;

    const resolveBySlug = async (s: string) => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, slug")
        .eq("slug", s)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setCommunity(prev => ({ ...prev, loading: false, notFound: true }));
      } else {
        setCommunity({
          communityId: data.id,
          communitySlug: data.slug,
          communityName: data.name,
          loading: false,
          notFound: false,
        });
      }
    };

    const resolveByAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        // Not authenticated — use default (landing page)
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: DEFAULT_COMMUNITY_SLUG,
          communityName: DEFAULT_COMMUNITY_NAME,
          loading: false,
          notFound: false,
        });
        return;
      }

      // Fetch user's community_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("community_id")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      const userCommunityId = profile?.community_id || DEFAULT_COMMUNITY_ID;

      // Look up community details
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
    };

    if (slug) {
      if (slug === DEFAULT_COMMUNITY_SLUG) {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: DEFAULT_COMMUNITY_SLUG,
          communityName: DEFAULT_COMMUNITY_NAME,
          loading: false,
          notFound: false,
        });
      } else {
        resolveBySlug(slug);
      }
    } else {
      // No slug provided — resolve from authenticated user's profile
      resolveByAuth();
    }

    return () => { cancelled = true; };
  }, [slug]);

  // Listen for auth changes to re-resolve when no slug
  useEffect(() => {
    if (slug) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCommunity({
          communityId: DEFAULT_COMMUNITY_ID,
          communitySlug: DEFAULT_COMMUNITY_SLUG,
          communityName: DEFAULT_COMMUNITY_NAME,
          loading: false,
          notFound: false,
        });
      } else if (event === 'SIGNED_IN' && session?.user) {
        setCommunity(prev => ({ ...prev, loading: true }));

        const { data: profile } = await supabase
          .from("profiles")
          .select("community_id")
          .eq("id", session.user.id)
          .single();

        const userCommunityId = profile?.community_id || DEFAULT_COMMUNITY_ID;

        const { data: comm } = await supabase
          .from("communities")
          .select("id, name, slug")
          .eq("id", userCommunityId)
          .maybeSingle();

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
      }
    });

    return () => subscription.unsubscribe();
  }, [slug]);

  return (
    <CommunityContext.Provider value={community}>
      {children}
    </CommunityContext.Provider>
  );
}
