import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoverableCommunity {
  slug: string;
  name: string;
  public_location_label: string | null;
  latitude: number;
  longitude: number;
  join_mode: string;
}

export const DISCOVERABLE_COMMUNITIES_QUERY_KEY = ["discoverable_communities"];

async function fetchDiscoverableCommunities(): Promise<DiscoverableCommunity[]> {
  const { data, error } = await supabase.rpc("get_discoverable_communities");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    slug: r.slug,
    name: r.name,
    public_location_label: r.public_location_label,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    join_mode: r.join_mode,
  }));
}

export function useDiscoverableCommunities() {
  return useQuery({
    queryKey: DISCOVERABLE_COMMUNITIES_QUERY_KEY,
    queryFn: fetchDiscoverableCommunities,
    staleTime: 5 * 60 * 1000,
  });
}
