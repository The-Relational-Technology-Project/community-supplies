import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCommunity } from "@/contexts/CommunityContext";
import { Mail, Eye, Send, Check, X, Loader2 } from "lucide-react";

const FLAGSHIP_SLUG = "sunset-richmond";
const TEST_EMAIL = "joshuanesbit@gmail.com";

interface Recipient {
  userId: string;
  name: string;
  email: string;
  communityName: string;
  communitySlug: string;
  stewardSince: string;
}

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; id?: string }
  | { status: "error"; message: string };

export function StewardWelcomeBatch() {
  const { toast } = useToast();
  const { communitySlug } = useCommunity();
  const [sinceDays, setSinceDays] = useState(30);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendStates, setSendStates] = useState<Record<string, SendState>>({});
  const [testState, setTestState] = useState<SendState>({ status: "idle" });

  if (communitySlug !== FLAGSHIP_SLUG) return null;

  const loadList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-steward-welcome", {
        body: { mode: "list", sinceDays },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRecipients((data as any).recipients || []);
      setSendStates({});
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendOne = async (key: string, body: Record<string, any>) => {
    const setState = (s: SendState) => {
      if (key === "__test__") setTestState(s);
      else setSendStates(prev => ({ ...prev, [key]: s }));
    };
    setState({ status: "sending" });
    try {
      const { data, error } = await supabase.functions.invoke("send-steward-welcome", {
        body: { mode: "send", ...body },
      });
      if (error) throw new Error(error.message || "Function invocation failed");
      const d = data as any;
      if (!d?.success) {
        const msg = d?.error || `Send failed (status ${d?.status ?? "unknown"})`;
        setState({ status: "error", message: msg });
        toast({ title: "Send failed", description: msg, variant: "destructive" });
        return;
      }
      setState({ status: "sent", id: d.id });
      toast({ title: "Sent", description: `Resend id: ${d.id ?? "(none)"}` });
    } catch (e: any) {
      setState({ status: "error", message: e.message });
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
  };

  const renderState = (s: SendState | undefined) => {
    if (!s || s.status === "idle") return null;
    if (s.status === "sending") return <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />sending…</span>;
    if (s.status === "sent") return <span className="text-xs text-green-700 inline-flex items-center gap-1"><Check className="h-3 w-3" />sent {s.id ? `· ${s.id.slice(0, 8)}…` : ""}</span>;
    return <span className="text-xs text-destructive inline-flex items-center gap-1"><X className="h-3 w-3" />{s.message}</span>;
  };

  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Steward Welcome Email (Admin only)
        </CardTitle>
        <CardDescription>
          One click per steward. Each click triggers one real Resend send and shows the actual result.
          Flagship community is excluded automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label htmlFor="since-days">Stewards from the last</Label>
            <div className="flex items-center gap-2">
              <Input
                id="since-days"
                type="number"
                min={1}
                max={365}
                value={sinceDays}
                onChange={(e) => setSinceDays(Number(e.target.value) || 30)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          <Button onClick={loadList} disabled={loading} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            {loading ? "Loading…" : "Load stewards"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => sendOne("__test__", {
                overrideEmail: TEST_EMAIL,
                overrideName: "Josh",
                overrideCommunityName: "Test Community",
                overrideCommunitySlug: "test-community",
              })}
              disabled={testState.status === "sending"}
            >
              <Send className="h-4 w-4 mr-2" />
              Send test to me
            </Button>
            {renderState(testState)}
          </div>
        </div>

        {recipients && (
          <div className="space-y-2">
            <p className="text-sm">
              <strong>{recipients.length}</strong> steward{recipients.length === 1 ? "" : "s"} found
            </p>
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No stewards in this window.</p>
            ) : (
              <div className="border rounded-md divide-y bg-background">
                {recipients.map(r => {
                  const s = sendStates[r.userId];
                  const sent = s?.status === "sent";
                  const sending = s?.status === "sending";
                  return (
                    <div key={r.userId} className="flex items-center gap-3 p-3 flex-wrap">
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
                      <div className="flex items-center gap-2">
                        {renderState(s)}
                        <Button
                          size="sm"
                          variant={sent ? "outline" : "default"}
                          disabled={sending || sent}
                          onClick={() => sendOne(r.userId, { userId: r.userId })}
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? "Sent" : "Send"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
