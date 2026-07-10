import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { fileJoinRequest, autoJoinCommunity } from "@/lib/joinCommunity";
import { Users } from "lucide-react";

interface JoinThisCommunityProps {
  targetCommunityId: string;
  targetCommunityName: string;
  onJoined: () => void;
}

export function JoinThisCommunity({
  targetCommunityId,
  targetCommunityName,
  onJoined,
}: JoinThisCommunityProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [joinMode, setJoinMode] = useState<"auto" | "approval_required" | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string | null>(null);
  const [currentCommunityName, setCurrentCommunityName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [crossStreets, setCrossStreets] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: community }, { data: profile }] = await Promise.all([
        supabase
          .from("communities")
          .select("join_mode, custom_join_question")
          .eq("id", targetCommunityId)
          .maybeSingle(),
        user
          ? supabase
              .from("profiles")
              .select("community_id, communities!inner(name)")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setJoinMode(((community as any)?.join_mode as any) ?? "auto");
      setCustomQuestion(((community as any)?.custom_join_question as string) ?? null);
      setCurrentCommunityName(((profile as any)?.communities?.name as string) ?? null);

      // Detect a pending request already on file for this community
      if (user) {
        const { data: existing } = await supabase
          .from("join_requests")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("community_id", targetCommunityId)
          .order("requested_at", { ascending: false })
          .limit(1);
        if (!cancelled && existing && existing[0]?.status === "pending") {
          setRequestSent(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetCommunityId, user?.id]);

  const handleAutoJoin = async () => {
    setSubmitting(true);
    const { error } = await autoJoinCommunity(targetCommunityId);
    setSubmitting(false);
    if (error) {
      toast({
        title: "Couldn't join",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `Welcome to ${targetCommunityName}!`,
      description: "You're in.",
    });
    onJoined();
  };

  const handleRequestToJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!crossStreets.trim()) {
      toast({ title: "Cross streets required", description: "Please tell your steward what two streets you live near.", variant: "destructive" });
      return;
    }
    if (customQuestion && !customAnswer.trim()) {
      toast({ title: "Answer required", description: "Please answer the community's screening question.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await fileJoinRequest({
      communityId: targetCommunityId,
      userId: user.id,
      name: user.user_metadata?.name ?? user.email ?? "",
      email: user.email ?? "",
      crossStreets: crossStreets.trim(),
      customAnswer: customQuestion ? customAnswer.trim() : null,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Couldn't send request",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRequestSent(true);
    toast({
      title: "Request sent",
      description: `A ${targetCommunityName} steward will review your request.`,
    });
  };

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-terracotta p-3 rounded-full">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">Join {targetCommunityName}</CardTitle>
          <CardDescription>
            You're signed in as <strong>{user?.email}</strong>
            {currentCommunityName && (
              <>
                {" "}
                and currently a member of <strong>{currentCommunityName}</strong>.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {joinMode === null ? (
            <p className="text-sm text-muted-foreground text-center">Loading…</p>
          ) : joinMode === "auto" ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {targetCommunityName} is open to join. Switching will move your account into
                this community.
              </p>
              <Button
                className="w-full"
                onClick={handleAutoJoin}
                disabled={submitting}
              >
                {submitting ? "Joining…" : `Join ${targetCommunityName}`}
              </Button>
            </>
          ) : requestSent ? (
            <p className="text-sm text-center text-muted-foreground">
              Your request to join {targetCommunityName} is pending steward review. You'll
              get an email once it's approved.
            </p>
          ) : (
            <form onSubmit={handleRequestToJoin} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {targetCommunityName} requires steward approval. Answer a couple of quick
                questions and we'll send your request.
              </p>

              <div>
                <Label htmlFor="jtc-cross-streets" className="text-sm">
                  Cross streets <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jtc-cross-streets"
                  value={crossStreets}
                  onChange={(e) => setCrossStreets(e.target.value)}
                  placeholder="e.g. 24th Ave & Noriega St"
                  required
                  className="h-11 text-base"
                  autoComplete="street-address"
                />
              </div>

              {customQuestion && (
                <div>
                  <Label htmlFor="jtc-custom-answer" className="text-sm">
                    {customQuestion} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="jtc-custom-answer"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    rows={3}
                    required
                    className="text-base resize-none"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : `Request to join ${targetCommunityName}`}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
