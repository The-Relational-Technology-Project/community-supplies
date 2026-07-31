import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/hooks/useAuth";

export const ITEM_REQUESTS_QUERY_KEY = ["item-requests"] as const;

export interface ItemRequest {
  id: string;
  title: string;
  category: string | null;
  note: string | null;
  status: string;
  created_at: string;
  requester_id: string;
  requester_name: string | null;
  fulfilled_supply_id: string | null;
  fulfilled_supply_name: string | null;
  fulfilled_at: string | null;
}

export function useItemRequests(options: { enabled?: boolean } = {}) {
  const { communityId } = useCommunity();
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...ITEM_REQUESTS_QUERY_KEY, communityId, user?.id],
    queryFn: async (): Promise<ItemRequest[]> => {
      const { data, error } = await supabase.rpc("get_item_requests", {
        p_community_id: communityId,
      });
      if (error) throw error;
      return (data || []) as ItemRequest[];
    },
    enabled: (options.enabled ?? true) && isReady && !!user && !!communityId,
    retry: 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ITEM_REQUESTS_QUERY_KEY });

  return {
    requests: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}

export async function createItemRequest(input: {
  communityId: string;
  title: string;
  category?: string | null;
  note?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to post a request.");

  const { error } = await supabase.from("item_requests").insert({
    community_id: input.communityId,
    requester_id: user.id,
    title: input.title.trim(),
    category: input.category || null,
    note: input.note?.trim() || null,
  });
  if (error) throw error;
}

export async function closeItemRequest(requestId: string) {
  const { error } = await supabase
    .from("item_requests")
    .update({ status: "closed" })
    .eq("id", requestId);
  if (error) throw error;
}

export async function reopenItemRequest(requestId: string) {
  const { error } = await supabase
    .from("item_requests")
    .update({ status: "open" })
    .eq("id", requestId);
  if (error) throw error;
}

export async function deleteItemRequest(requestId: string) {
  const { error } = await supabase.from("item_requests").delete().eq("id", requestId);
  if (error) throw error;
}

/**
 * Marks a request fulfilled by a supply the current user owns and emails the
 * requester. Safe to call after a successful supply insert.
 */
export async function fulfillItemRequest(requestId: string, supplyId: string) {
  const { error } = await supabase.rpc("fulfill_item_request", {
    p_request_id: requestId,
    p_supply_id: supplyId,
  });
  if (error) throw error;

  const { error: emailError } = await supabase.functions.invoke(
    "send-request-fulfilled",
    { body: { requestId, supplyId } }
  );
  if (emailError) {
    console.error("[requests] fulfillment email failed", emailError);
  }
}
