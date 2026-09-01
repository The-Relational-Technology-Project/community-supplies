/**
 * Signed, login-free unsubscribe tokens for Request Board emails.
 * The token is an HMAC of the profile id, so a link can't be forged or
 * guessed for another member.
 */

const encoder = new TextEncoder();

async function key(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeUnsubscribeToken(profileId: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), encoder.encode(`unsub:${profileId}`));
  return toHex(sig).slice(0, 32);
}

export async function verifyUnsubscribeToken(profileId: string, token: string): Promise<boolean> {
  const expected = await makeUnsubscribeToken(profileId);
  if (expected.length !== token.length) return false;
  // constant-time-ish comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export function unsubscribeUrl(projectUrl: string, profileId: string, token: string): string {
  return `${projectUrl}/functions/v1/request-emails-unsubscribe?p=${profileId}&t=${token}`;
}
