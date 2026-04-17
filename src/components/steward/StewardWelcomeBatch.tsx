import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { Mail, Send, Eye, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FLAGSHIP_SLUG = "sunset-richmond";

interface Recipient {
  userId: string;
  name: string;
  email: string;
  communityName: string;
  communitySlug: string;
  stewardSince: string;
}

export function StewardWelcomeBatch() {
  const { toast } = useToast();
  const { communitySlug } = useCommunity();
  const [sinceDays, setSinceDays] = useState(7);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  // Only render for flagship steward
  if (communitySlug !== FLAGSHIP_SLUG) return null;

  const loadPreview = async () => {
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-steward-welcome", {
        body: { dryRun: true, sinceDays },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRecipients((data as any).recipients || []);
      setExcluded(new Set());
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const toggleExclude = (id: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-steward-welcome", {
        body: {
          dryRun: false,
          sinceDays,
          excludeUserIds: Array.from(excluded),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Welcome emails sent",
        description: `Sent to ${(data as any).recipientCount} steward(s).`,
      });
      setRecipients(null);
      setExcluded(new Set());
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const finalCount = recipients ? recipients.filter(r => !excluded.has(r.userId)).length : 0;

  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Steward Welcome Email (Admin only)
        </CardTitle>
        <CardDescription>
          Send the "Next steps for your community" email to stewards who created communities recently.
          Visible only to you (flagship steward). The flagship community is excluded automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="since-days">Stewards from the last</Label>
            <div className="flex items-center gap-2">
              <Input
                id="since-days"
                type="number"
                min={1}
                max={60}
                value={sinceDays}
                onChange={(e) => setSinceDays(Number(e.target.value) || 7)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          <Button onClick={loadPreview} disabled={previewing} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            {previewing ? "Loading…" : "Preview recipients"}
          </Button>
        </div>

        {recipients && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <strong>{finalCount}</strong> recipient{finalCount === 1 ? "" : "s"}
                {excluded.size > 0 && ` (${excluded.size} excluded)`}
              </p>
            </div>

            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No stewards found in this window.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-96 overflow-y-auto bg-background">
                {recipients.map(r => (
                  <label
                    key={r.userId}
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={!excluded.has(r.userId)}
                      onCheckedChange={() => toggleExclude(r.userId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{r.name || "(no name)"}</span>
                        <span className="text-sm text-muted-foreground truncate">{r.email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="mr-2">{r.communityName}</Badge>
                        /c/{r.communitySlug}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {finalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={sending}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Sending…" : `Send to ${finalCount} steward${finalCount === 1 ? "" : "s"}`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Send welcome email?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send the "Next steps for your community" email from
                      hello@relationaltechproject.org to <strong>{finalCount}</strong> steward
                      {finalCount === 1 ? "" : "s"} individually. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSend}>Send now</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
