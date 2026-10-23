import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function MemberAgreementSettings() {
  const { communityId } = useCommunity();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    (async () => {
      const { data } = await supabase
        .from("communities")
        .select("member_agreement" as any)
        .eq("id", communityId)
        .maybeSingle();
      const t = (data as any)?.member_agreement ?? "";
      setText(t);
      setInitial(t);
      setLoading(false);
    })();
  }, [communityId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ member_agreement: text.trim() || null } as any)
      .eq("id", communityId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save agreement", description: error.message, variant: "destructive" });
      return;
    }
    setInitial(text);
    toast({
      title: "Saved",
      description: text.trim()
        ? "New members must agree before joining."
        : "Member agreement removed.",
    });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Member Agreement</CardTitle>
        <CardDescription>
          Optional. Paste an agreement (like a hold-harmless / liability waiver) that new members must
          check "I agree" to before joining. The date they agreed shows on each join request. Leave blank to skip.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. By joining, I agree that I borrow and lend items at my own risk and hold harmless..."
          rows={6}
          maxLength={10000}
        />
        <p className="text-xs text-muted-foreground">
          A checkbox records that someone agreed; whether your wording is legally sufficient is up to you.
        </p>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || text === initial}>
            {saving ? "Saving..." : "Save agreement"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
