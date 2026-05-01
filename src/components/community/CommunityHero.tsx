import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Package, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  public_location_label: string | null;
  join_mode: string;
  discoverable: boolean;
  member_count: number;
  supply_count: number;
  book_count: number;
}

interface CommunityHeroProps {
  slug: string;
  onJoinClick: () => void;
}

export function CommunityHero({ slug, onJoinClick }: CommunityHeroProps) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_community_public_stats", {
        p_slug: slug,
      });
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        const row = data[0] as any;
        setStats({
          ...row,
          member_count: Number(row.member_count),
          supply_count: Number(row.supply_count),
          book_count: Number(row.book_count),
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <section className="bg-peach/30 border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-32 w-full max-w-3xl mx-auto" />
        </div>
      </section>
    );
  }

  if (!stats || !stats.discoverable) return null;

  const isOpen = stats.join_mode === "auto";

  return (
    <section className="bg-peach/30 border-b border-border">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className="border-terracotta/40 text-terracotta">
              {isOpen ? "Open community" : "Application required"}
            </Badge>
            {stats.public_location_label && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {stats.public_location_label}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-deep-brown mb-2">
            {stats.name}
          </h1>

          {stats.description && (
            <p className="text-base text-muted-foreground mb-4 leading-relaxed">
              {stats.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 text-sm text-deep-brown bg-white/70 border border-border rounded-sm px-3 py-1.5">
              <Users className="h-4 w-4 text-terracotta" />
              <strong>{stats.member_count}</strong> neighbors
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-deep-brown bg-white/70 border border-border rounded-sm px-3 py-1.5">
              <Package className="h-4 w-4 text-terracotta" />
              <strong>{stats.supply_count}</strong> supplies
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-deep-brown bg-white/70 border border-border rounded-sm px-3 py-1.5">
              <BookOpen className="h-4 w-4 text-terracotta" />
              <strong>{stats.book_count}</strong> books
            </span>
          </div>

          <Button size="lg" onClick={onJoinClick}>
            {isOpen ? `Join ${stats.name}` : `Request to join ${stats.name}`}
          </Button>
        </div>
      </div>
    </section>
  );
}
