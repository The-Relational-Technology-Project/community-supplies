import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

export function JoinModeToggle() {
  const { communityId } = useCommunity();
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchJoinMode = async () => {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('join_mode')
          .eq('id', communityId)
          .single();

        if (error) throw error;
        setApprovalRequired(data?.join_mode === 'approval_required');
      } catch (error: any) {
        console.error('Error fetching join mode:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinMode();
  }, [communityId]);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const newMode = checked ? 'approval_required' : 'auto';
      const { error } = await supabase
        .from('communities')
        .update({ join_mode: newMode })
        .eq('id', communityId);

      if (error) throw error;

      setApprovalRequired(checked);
      toast({
        title: checked ? "Approval required" : "Auto-join enabled",
        description: checked
          ? "New members will need your approval before they can access the community."
          : "New members will get immediate access when they sign up."
      });
    } catch (error: any) {
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Membership Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="join-mode">Require approval for new members</Label>
            <CardDescription>
              {approvalRequired
                ? "New signups must be approved by a steward before they can access shared items."
                : "New members get immediate access when they sign up."}
            </CardDescription>
          </div>
          <Switch
            id="join-mode"
            checked={approvalRequired}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
