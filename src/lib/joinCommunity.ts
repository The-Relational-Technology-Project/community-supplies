import { supabase } from "@/integrations/supabase/client";

// Single source of truth for joining a community, so every entry point
// (signup, post-login, the /c/:slug join screen, the standalone request form)
// behaves identically: always scope to a community_id, always notify stewards
// for approval-required communities, always use the same fields.

export interface FileJoinRequestParams {
  communityId: string;
  userId: string;
  name: string;
  email: string;
  intro?: string | null;
  crossStreets?: string | null;
  referralSource?: string | null;
  phoneNumber?: string | null;
}

/**
 * File a pending join request for an existing authenticated user and notify the
 * community's stewards. The DB insert is awaited before the notification fires
 * because send-join-notification only emails when a matching pending request
 * already exists.
 */
export async function fileJoinRequest(
  params: FileJoinRequestParams
): Promise<{ error: Error | null }> {
  const { communityId, userId, name, email } = params;

  const { error } = await supabase.from("join_requests").insert({
    user_id: userId,
    name,
    email,
    community_id: communityId,
    intro: params.intro ?? null,
    cross_streets: params.crossStreets ?? null,
    referral_source: params.referralSource ?? null,
    phone_number: params.phoneNumber ?? null,
  });

  if (error) return { error: error as unknown as Error };

  // Best-effort steward notification — never block the join on email delivery.
  try {
    await supabase.functions.invoke("send-join-notification", {
      body: {
        communityId,
        name,
        email,
        referralSource: params.referralSource ?? undefined,
        crossStreets: params.crossStreets ?? undefined,
        phoneNumber: params.phoneNumber ?? null,
      },
    });
  } catch (e) {
    console.error("send-join-notification failed:", e);
  }

  return { error: null };
}

/**
 * Auto-join an open ("auto" join_mode) community. Moves the caller's profile
 * into the community and activates them via the switch_user_community RPC.
 */
export async function autoJoinCommunity(
  communityId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("switch_user_community", {
    p_community_id: communityId,
  });
  return { error: (error as unknown as Error) ?? null };
}
