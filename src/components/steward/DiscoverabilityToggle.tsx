import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/contexts/CommunityContext";
import { useToast } from "@/hooks/use-toast";

interface CommunityRow {
  discoverable: boolean;
  latitude: number | null;
  longitude: number | null;
  coarse_latitude: number | null;
  coarse_longitude: number | null;
  public_location_label: string | null;
  join_mode: string;
}

export function DiscoverabilityToggle() {
  const { communityId } = useCommunity();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<CommunityRow | null>(null);

  // Editable form state
  const [label, setLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("communities")
        .select("discoverable, latitude, longitude, coarse_latitude, coarse_longitude, public_location_label, join_mode")
        .eq("id", communityId)
        .maybeSingle();
      if (data) {
        setRow(data as CommunityRow);
        setLabel(data.public_location_label ?? "");
        // Pre-fill lat/lng from existing precise OR fall back to coarse (city centroid)
        setLat(String(data.latitude ?? data.coarse_latitude ?? ""));
        setLng(String(data.longitude ?? data.coarse_longitude ?? ""));
      }
      setLoading(false);
    })();
  }, [communityId]);

  const handleToggle = async (checked: boolean) => {
    if (!row) return;
    // Require coords + label before going discoverable
    if (checked && (!lat || !lng || !label.trim())) {
      toast({
        title: "Add a location first",
        description: "Set a public area name and confirm the map coordinates before going discoverable.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const updates: any = { discoverable: checked };
      if (checked) {
        // Auto-flip to approval_required so stewards review every join
        updates.join_mode = "approval_required";
        updates.latitude = Number(lat);
        updates.longitude = Number(lng);
        updates.public_location_label = label.trim();
      }
      const { error } = await supabase.from("communities").update(updates).eq("id", communityId);
      if (error) throw error;
      setRow({ ...row, ...updates });
      toast({
        title: checked ? "Now discoverable" : "Hidden from discovery",
        description: checked
          ? "Your community now appears on the public map. New joiners will need your approval."
          : "Your community is no longer pinned on the public discovery map.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const updates: any = {
        public_location_label: label.trim() || null,
      };
      if (lat && lng) {
        updates.latitude = Number(lat);
        updates.longitude = Number(lng);
      }
      const { error } = await supabase.from("communities").update(updates).eq("id", communityId);
      if (error) throw error;
      setRow({ ...row, ...updates });
      toast({ title: "Location saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !row) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Discovery on Public Map</CardTitle>
        </div>
        <CardDescription>
          Until you toggle this on, your community shows only as an anonymous dot on the public spread map — no name, no link, no precise location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="public-label">Public area name</Label>
            <Input
              id="public-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sunset District, SF"
            />
            <p className="text-xs text-muted-foreground">Shown on the map pin. Keep it neighborhood-level.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="37.7749"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-122.4194"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSaveLocation} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Save location
          </Button>

          <div className="flex items-center gap-3">
            <Label htmlFor="discoverable" className="text-sm">
              {row.discoverable ? "Discoverable" : "Hidden"}
            </Label>
            <Switch
              id="discoverable"
              checked={row.discoverable}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>

        {row.discoverable && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-sm p-2">
            ✓ Visible on the public map · ✓ New members go through your approval queue
          </p>
        )}
      </CardContent>
    </Card>
  );
}
