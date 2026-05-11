import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";

export function RenameCommunity() {
  const { communityId, communityName } = useCommunity();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(communityName ?? "");
  }, [communityName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Name required", description: "Please enter a community name.", variant: "destructive" });
      return;
    }
    if (trimmed === communityName) return;
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ name: trimmed })
      .eq("id", communityId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't rename", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Community renamed", description: `Now called "${trimmed}". Refresh to see it everywhere.` });
  };

  const dirty = name.trim() !== (communityName ?? "") && name.trim().length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Community Name</CardTitle>
        </div>
        <CardDescription>
          Rename your community. The web address (URL) won't change, so existing invite links keep working.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="community-name">Display name</Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harrisonburg"
              maxLength={80}
            />
          </div>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save name
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
