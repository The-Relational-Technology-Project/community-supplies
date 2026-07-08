import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CustomJoinQuestion() {
  const { communityId } = useCommunity();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    (async () => {
      const { data } = await supabase
        .from("communities")
        .select("custom_join_question")
        .eq("id", communityId)
        .maybeSingle();
      const q = (data as any)?.custom_join_question ?? "";
      setQuestion(q);
      setInitial(q);
      setLoading(false);
    })();
  }, [communityId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("communities")
      .update({ custom_join_question: question.trim() || null } as any)
      .eq("id", communityId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save question", description: error.message, variant: "destructive" });
      return;
    }
    setInitial(question);
    toast({
      title: "Saved",
      description: question.trim()
        ? "New applicants will see this question."
        : "Custom join question removed.",
    });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Custom Join Question</CardTitle>
        <CardDescription>
          Ask an optional screening question on the join request form. Leave blank to skip.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="custom-join-question" className="text-sm">Question</Label>
        <Textarea
          id="custom-join-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "What is a Columbia City Neighbors Club event you have attended?"'
          rows={2}
          maxLength={500}
        />
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || question === initial}>
            {saving ? "Saving..." : "Save question"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
