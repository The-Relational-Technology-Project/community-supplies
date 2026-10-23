import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Loads a community's optional member agreement (e.g. hold-harmless text). */
export function useMemberAgreement(communityId?: string | null) {
  const [text, setText] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const { data } = await supabase
        .from("communities")
        .select("member_agreement" as any)
        .eq("id", communityId)
        .maybeSingle();
      if (cancelled) return;
      const t = ((data as any)?.member_agreement ?? "").trim();
      setText(t || null);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  return { text, loaded };
}

interface MemberAgreementProps {
  text: string;
  accepted: boolean;
  onAcceptedChange: (v: boolean) => void;
  idPrefix?: string;
}

export function MemberAgreement({ text, accepted, onAcceptedChange, idPrefix = "agreement" }: MemberAgreementProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-deep-brown">Member agreement</p>
      <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
        {text}
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`${idPrefix}-accept`}
          checked={accepted}
          onCheckedChange={(v) => onAcceptedChange(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor={`${idPrefix}-accept`} className="text-sm font-normal leading-snug">
          I have read and agree to this member agreement <span className="text-destructive">*</span>
        </Label>
      </div>
    </div>
  );
}

/** Best-effort: stamp the signed-in user's profile with the acceptance time. */
export async function recordAgreementAcceptance() {
  try {
    await supabase.rpc("accept_member_agreement" as any);
  } catch (e) {
    console.error("accept_member_agreement failed:", e);
  }
}
