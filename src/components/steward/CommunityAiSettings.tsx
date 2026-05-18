import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCommunity } from "@/contexts/CommunityContext";

export function CommunityAiSettings() {
  const { communityId, aiFeaturesEnabled } = useCommunity();
  const [enabled, setEnabled] = useState(aiFeaturesEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(aiFeaturesEnabled);
  }, [aiFeaturesEnabled]);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    const previous = enabled;
    setEnabled(next);
    const { error } = await supabase
      .from("communities")
      .update({ ai_features_enabled: next })
      .eq("id", communityId);
    setSaving(false);
    if (error) {
      setEnabled(previous);
      toast.error("Couldn't update AI setting. Please try again.");
      return;
    }
    toast.success(next ? "AI features turned on" : "AI features turned off");
    // Refresh so context picks up the new setting everywhere.
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-terracotta" />
          AI Features
        </CardTitle>
        <CardDescription>
          Choose whether your community uses AI to help draft listings and generate item illustrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
          <div className="space-y-1">
            <Label htmlFor="ai-toggle" className="text-base font-medium text-deep-brown">
              {enabled ? "AI is on for this community" : "AI is off for this community"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Members can optionally use AI to draft an item's name, description, and category from a photo. They can also generate a clean catalog-style illustration of each item. Members can always skip AI and write listings themselves."
                : "Members add photos and write descriptions themselves. The AI draft option and the catalog illustration tools are hidden across the site."}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="ai-toggle"
              checked={enabled}
              disabled={saving}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {enabled ? (
            <>Turn AI off if you'd prefer a simpler, fully manual experience for your neighbors.</>
          ) : (
            <>Turn AI on to give members optional AI help drafting listings and creating illustrations.</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
