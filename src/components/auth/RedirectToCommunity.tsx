import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RedirectToCommunityProps {
  /** Path suffix after /c/:slug, e.g. "/my-supplies" or "" */
  suffix: string;
}

/**
 * Back-compat redirect for legacy bare paths like /my-supplies.
 * Resolves the signed-in user's community slug and forwards to
 * /c/<slug><suffix>. If signed out, sends them home.
 */
export function RedirectToCommunity({ suffix }: RedirectToCommunityProps) {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    (async () => {
      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("communities!inner(slug)")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const slug = (data as any)?.communities?.slug;
      if (slug) {
        navigate(`/c/${slug}${suffix}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, user, suffix, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-terracotta border-t-transparent" />
    </div>
  );
}
