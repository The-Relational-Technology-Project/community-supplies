import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryResult {
  category: string;
  count: number;
}

export interface CrossCommunityResult {
  communityName: string;
  joinUrl: string;
  categories: CategoryResult[];
}

export function useCrossCommunitySearch(searchQuery: string, localResultCount: number) {
  const enabled = searchQuery.trim().length > 0 && localResultCount === 0;

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["cross-community-search", searchQuery],
    queryFn: async (): Promise<CrossCommunityResult[]> => {
      const { data, error } = await supabase.functions.invoke("cross-community-search", {
        body: { query: searchQuery },
      });

      if (error) {
        console.error("Cross-community search error:", error);
        return [];
      }

      return data || [];
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  return {
    crossResults: data || [],
    isSearching: isLoading && enabled,
    hasSearched: isFetched && enabled,
  };
}
