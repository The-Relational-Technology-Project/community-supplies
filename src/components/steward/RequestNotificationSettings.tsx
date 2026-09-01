import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Mode = "off" | "each" | "weekly";

const OPTIONS: { value: Mode; label: string; help: string }[] = [
  { value: "off", label: "Off", help: "Members only see requests when they open the Request Board." },
  {
    value: "each",
    label: "Email members about each request",
    help: "Every active member gets one email as soon as a neighbor posts a request.",
  },
  {
    value: "weekly",
    label: "Weekly digest",
    help: "One email a week listing that week's still-open requests. Quiet weeks send nothing.",
  },
];

export function RequestNotificationSettings() {
  const { communityId } = useCommunity();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("off");
  const [initial, setInitial] = useState<Mode>("off");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    (async () => {
      const { data } = await supabase
        .from("communities")
        .select("request_notify_mode")
        .eq("id", communityId)
        .maybeSingle();
      const value = ((data as any)?.request_notify_mode ?? "off") as Mode;
      setMode(value);
      setInitial(value);
      setLoading(false);
    })();
  }, [communityId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ request_notify_mode: mode } as any)
      .eq("id", communityId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save setting", description: error.message, variant: "destructive" });
      return;
    }
    setInitial(mode);
    toast({
      title: "Saved",
      description:
        mode === "off"
          ? "Request emails are off."
          : mode === "each"
          ? "Members will be emailed about each new request."
          : "Members will get a weekly digest of open requests.",
    });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Request Board Notifications</CardTitle>
        <CardDescription>
          Decide whether members hear about new requests by email. Off by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-3">
          {OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupItem value={option.value} id={`notify-${option.value}`} className="mt-1" />
              <Label htmlFor={`notify-${option.value}`} className="font-normal cursor-pointer">
                <span className="block font-medium text-deep-brown">{option.label}</span>
                <span className="block text-sm text-muted-foreground">{option.help}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          Every email includes a one-click link so a member can turn these off for themselves.
        </p>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || mode === initial}>
            {saving ? "Saving..." : "Save setting"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
