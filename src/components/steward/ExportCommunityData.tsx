import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value) ? value.join(" | ") : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function ExportCommunityData() {
  const [loading, setLoading] = useState(false);
  const { communityId, communitySlug, communityName } = useCommunity();
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const [ownersRes, itemsRes] = await Promise.all([
        supabase.rpc("get_supplies_with_owners", { p_community_id: communityId }),
        supabase
          .from("supplies")
          .select(
            "id, name, description, category, condition, neighborhood, cross_streets, lent_out, image_url, images, illustration_url, created_at"
          )
          .eq("community_id", communityId)
          .order("created_at", { ascending: false }),
      ]);

      if (ownersRes.error) throw ownersRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const ownerById = new Map<string, string>();
      (ownersRes.data || []).forEach((row: any) => ownerById.set(row.id, row.owner_name || ""));

      const rows = itemsRes.data || [];
      if (rows.length === 0) {
        toast({ title: "Nothing to export", description: "This community has no items yet." });
        return;
      }

      const headers = [
        "Item name",
        "Description",
        "Category",
        "Condition",
        "Owner",
        "Neighborhood",
        "Cross streets",
        "Status",
        "Photo URLs",
        "Illustration URL",
        "Added",
      ];

      const lines = [headers.map(csvEscape).join(",")];
      for (const r of rows as any[]) {
        const photos = [r.image_url, ...(r.images || [])]
          .filter((u: string | null) => !!u && String(u).startsWith("http"));
        lines.push(
          [
            r.name,
            r.description,
            r.category,
            r.condition,
            ownerById.get(r.id) || "",
            r.neighborhood,
            r.cross_streets,
            r.lent_out ? "Lent out" : "Available",
            Array.from(new Set(photos)),
            r.illustration_url,
            r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
          ]
            .map(csvEscape)
            .join(",")
        );
      }

      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${communitySlug || "community"}-items-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "Export ready", description: `${rows.length} items exported.` });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message ?? "Could not export community data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-serif">Export Community Data</CardTitle>
        <CardDescription>
          Download every item in {communityName} as a spreadsheet — names, descriptions, owners,
          status, photo links, and illustration links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? "Preparing CSV…" : "Export Community Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
