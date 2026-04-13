import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "react-router-dom";
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
    loading: !!slug && slug !== DEFAULT_COMMUNITY_SLUG,
    notFound: false,
  });

  useEffect(() => {
    if (!slug || slug === DEFAULT_COMMUNITY_SLUG) {
      setCommunity({
        communityId: DEFAULT_COMMUNITY_ID,
        communitySlug: DEFAULT_COMMUNITY_SLUG,
        communityName: DEFAULT_COMMUNITY_NAME,
        loading: false,
        notFound: false,
      });
      return;
    }

    const fetchCommunity = async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();

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

    fetchCommunity();
  }, [slug]);

  return (
    <CommunityContext.Provider value={community}>
      {children}
    </CommunityContext.Provider>
  );
}
