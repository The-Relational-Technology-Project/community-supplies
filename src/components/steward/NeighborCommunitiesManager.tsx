import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Neighbor {
  id: string;
  name: string;
  slug: string;
  search_endpoint: string;
  join_url: string;
  federation_key: string;
  enabled: boolean;
  created_at: string;
}

export function NeighborCommunitiesManager() {
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    search_endpoint: "",
    join_url: "",
    federation_key: "",
  });

  const fetchNeighbors = async () => {
    const { data, error } = await supabase
      .from("community_neighbors")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching neighbors:", error);
    } else {
      setNeighbors((data as unknown as Neighbor[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNeighbors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("community_neighbors").insert([
      {
        name: form.name,
        slug: form.slug,
        search_endpoint: form.search_endpoint,
        join_url: form.join_url,
        federation_key: form.federation_key,
      } as any,
    ]);

    if (error) {
      toast.error("Failed to add neighbor: " + error.message);
    } else {
      toast.success("Neighbor community added");
      setForm({ name: "", slug: "", search_endpoint: "", join_url: "", federation_key: "" });
      setShowForm(false);
      fetchNeighbors();
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("community_neighbors")
      .update({ enabled } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      setNeighbors((prev) => prev.map((n) => (n.id === id ? { ...n, enabled } : n)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this neighbor community?")) return;

    const { error } = await supabase.from("community_neighbors").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      setNeighbors((prev) => prev.filter((n) => n.id !== id));
      toast.success("Neighbor removed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Manage nearby sharing communities for federated search. When a member's search returns no
        local results, we'll check these neighbors and show category-level matches.
      </p>

      {neighbors.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">No neighbor communities configured yet.</p>
      )}

      {neighbors.map((neighbor) => (
        <div key={neighbor.id} className="border border-border rounded-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{neighbor.name}</h4>
              <p className="text-xs text-muted-foreground">{neighbor.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${neighbor.id}`} className="text-xs">
                  Enabled
                </Label>
                <Switch
                  id={`toggle-${neighbor.id}`}
                  checked={neighbor.enabled}
                  onCheckedChange={(checked) => handleToggle(neighbor.id, checked)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(neighbor.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Endpoint: {neighbor.search_endpoint}</p>
            <p>Join URL: {neighbor.join_url}</p>
            <p>Federation key: {neighbor.federation_key.slice(0, 8)}...</p>
          </div>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleSubmit} className="border border-border rounded-sm p-4 space-y-4">
          <h4 className="font-semibold">Add Neighbor Community</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Community Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Inner Sunset Shares"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="inner-sunset"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="search_endpoint">Search Endpoint URL</Label>
              <Input
                id="search_endpoint"
                required
                type="url"
                value={form.search_endpoint}
                onChange={(e) => setForm((f) => ({ ...f, search_endpoint: e.target.value }))}
                placeholder="https://xyz.supabase.co/functions/v1/search-public-catalog"
              />
            </div>
            <div>
              <Label htmlFor="join_url">Join URL</Label>
              <Input
                id="join_url"
                required
                type="url"
                value={form.join_url}
                onChange={(e) => setForm((f) => ({ ...f, join_url: e.target.value }))}
                placeholder="https://their-community.example.com"
              />
            </div>
            <div>
              <Label htmlFor="federation_key">Federation Key</Label>
              <Input
                id="federation_key"
                required
                value={form.federation_key}
                onChange={(e) => setForm((f) => ({ ...f, federation_key: e.target.value }))}
                placeholder="Shared secret"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Neighbor Community
        </Button>
      )}
    </div>
  );
}
