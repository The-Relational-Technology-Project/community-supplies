const serve = Deno.serve;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { verifyUnsubscribeToken } from "../_shared/unsubscribeToken.ts";

/**
 * One-click, login-free opt-out from Request Board emails.
 * Reached only through the signed link at the bottom of those emails.
 */

function page(title: string, message: string, status = 200): Response {
  return new Response(
    `<!doctype html>
     <html lang="en"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1">
     <title>${title}</title></head>
     <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#faf3ec; color:#4a3728; padding:48px 20px;">
       <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
         <h1 style="color:#c17c4a;font-size:24px;margin-top:0;">${title}</h1>
         <p style="line-height:1.6;color:#6b5a4a;">${message}</p>
         <p><a href="https://communitysupplies.org" style="color:#c17c4a;">Back to Community Supplies</a></p>
       </div>
     </body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const profileId = url.searchParams.get("p") ?? "";
    const token = url.searchParams.get("t") ?? "";

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
    if (!isUuid || !token || !(await verifyUnsubscribeToken(profileId, token))) {
      return page("Link not valid", "This unsubscribe link is invalid or has expired. You can also turn these emails off from your profile page.", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error } = await supabase
      .from("profiles")
      .update({ request_emails_opt_out: true })
      .eq("id", profileId);

    if (error) {
      console.error("unsubscribe update failed", error);
      return page("Something went wrong", "We couldn't update your preference just now. Please try again in a moment.", 500);
    }

    return page(
      "You're unsubscribed",
      "You won't get Request Board emails anymore. You'll still see requests in the app, and you can turn emails back on from your profile page anytime."
    );
  } catch (error: any) {
    console.error("Error in request-emails-unsubscribe:", error);
    return page("Something went wrong", "Please try again in a moment.", 500);
  }
});
