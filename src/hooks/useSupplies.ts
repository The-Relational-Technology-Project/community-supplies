import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Supply } from "@/types/supply";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/hooks/useAuth";

export const SUPPLIES_QUERY_KEY = ['supplies'] as const;

export const fetchSupplies = async (communityId?: string): Promise<Supply[]> => {
  const { data: suppliesData, error } = await supabase
    .rpc('get_supplies_with_owners', communityId ? { p_community_id: communityId } : {});

  if (error) throw error;

  return (suppliesData || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    condition: item.condition as 'excellent' | 'good' | 'fair',
    partyTypes: item.party_types || [],
    dateAvailable: item.date_available || new Date().toISOString().split('T')[0],
    location: item.location,
    neighborhood: item.neighborhood,
    crossStreets: item.cross_streets,
    contactEmail: item.contact_email,
    image: item.image_url,
    images: item.images || (item.image_url ? [item.image_url] : []),
    illustration_url: item.illustration_url,
    houseRules: item.house_rules || [],
    ownerId: item.owner_id,
    lentOut: item.lent_out || false,
    owner: {
      name: item.owner_name || 'Unknown',
      zipCode: item.owner_zip_code || '00000',
      location: `${item.owner_zip_code === '00000' || !item.owner_zip_code ? 'Unknown' : item.owner_zip_code} area`,
      avatar: ''
    }
  }));
};

export function useSupplies() {
  const { toast } = useToast();
  const { communityId } = useCommunity();

  const { data: supplies = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: [...SUPPLIES_QUERY_KEY, communityId],
    queryFn: () => fetchSupplies(communityId),
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading supplies",
        description: error instanceof Error ? error.message : "Failed to load supplies",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  return { supplies, loading, refetch };
}
