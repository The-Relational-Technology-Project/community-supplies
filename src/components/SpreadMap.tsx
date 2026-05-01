import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useDiscoverableCommunities } from "@/hooks/useDiscoverableCommunities";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// US states GeoJSON — bundled via CDN, cached after first load
const US_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface AnonPin { lat: number; lng: number; }

export function SpreadMap() {
  const [anonPins, setAnonPins] = useState<AnonPin[]>([]);
  const [intl, setIntl] = useState<string[]>([]);
  const [loadingMisc, setLoadingMisc] = useState(true);
  const { data: discoverable = [], isLoading: loadingDisc } = useDiscoverableCommunities();

  useEffect(() => {
    (async () => {
      const [anonRes, intlRes] = await Promise.all([
        supabase.rpc("get_anonymous_pins"),
        supabase.rpc("get_intl_communities"),
      ]);
      setAnonPins((anonRes.data ?? []).map((r: any) => ({ lat: Number(r.lat), lng: Number(r.lng) })));
      setIntl((intlRes.data ?? []).map((r: any) => r.intl_label).filter(Boolean));
      setLoadingMisc(false);
    })();
  }, []);

  const loading = loadingMisc || loadingDisc;

  // Group anonymous pins by rounded lat/lng so multi-community cities show as one stronger dot
  const grouped = new Map<string, { lat: number; lng: number; count: number }>();
  for (const p of anonPins) {
    const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
    const cur = grouped.get(key);
    if (cur) cur.count++;
    else grouped.set(key, { lat: p.lat, lng: p.lng, count: 1 });
  }

  const totalPins = anonPins.length + discoverable.length;

  return (
    <section className="container mx-auto px-4 pb-12 sm:pb-16">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-deep-brown">
          A growing movement
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {loading
            ? "Mapping sharing communities…"
            : "120+ sharing communities across the United States, and more around the world."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 max-w-5xl mx-auto">
        {/* Map */}
        <div className="bg-card border border-border rounded-sm p-2 sm:p-4">
          {loading ? (
            <Skeleton className="aspect-[16/10] w-full rounded-sm" />
          ) : (
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              width={800}
              height={500}
              style={{ width: "100%", height: "auto" }}
            >
              <Geographies geography={US_TOPO_URL}>
                {({ geographies }: any) =>
                  geographies.map((geo: any) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: "hsl(var(--sand))",
                          stroke: "hsl(var(--deep-brown) / 0.2)",
                          strokeWidth: 0.5,
                          outline: "none",
                        },
                        hover: { fill: "hsl(var(--sand))", outline: "none" },
                        pressed: { fill: "hsl(var(--sand))", outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Anonymous pins — soft terracotta dots */}
              {[...grouped.values()].map((p, i) => (
                <Marker key={`a-${i}`} coordinates={[p.lng, p.lat]}>
                  <circle
                    r={Math.min(3 + p.count * 0.8, 7)}
                    fill="hsl(var(--terracotta))"
                    fillOpacity={0.55}
                    stroke="hsl(var(--terracotta))"
                    strokeWidth={0.5}
                  />
                </Marker>
              ))}

              {/* Discoverable pins — clickable, labeled, tooltips on hover */}
              {discoverable.map((c) => {
                const isOpen = c.join_mode === "auto";
                return (
                  <Marker key={c.slug} coordinates={[c.longitude, c.latitude]}>
                    <HoverCard openDelay={80} closeDelay={120}>
                      <HoverCardTrigger asChild>
                        <g style={{ cursor: "pointer" }}>
                          {/* Pulse ring */}
                          <circle
                            r={9}
                            fill="hsl(var(--terracotta))"
                            fillOpacity={0.18}
                            className="animate-pulse"
                          />
                          {/* Larger transparent hit area for taps */}
                          <circle r={14} fill="transparent" />
                          <circle
                            r={7}
                            fill="hsl(var(--deep-brown))"
                            stroke="white"
                            strokeWidth={1.5}
                          />
                        </g>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-60 p-3" side="top">
                        <div className="space-y-1.5">
                          <div className="font-serif font-semibold text-deep-brown text-sm leading-tight">
                            {c.name}
                          </div>
                          {c.public_location_label && (
                            <div className="text-xs text-muted-foreground">
                              {c.public_location_label}
                            </div>
                          )}
                          <div className="text-[10px] uppercase tracking-wide text-terracotta font-medium">
                            {isOpen ? "Open — join instantly" : "Apply to join"}
                          </div>
                          <Link
                            to={`/c/${c.slug}`}
                            className="inline-block mt-1 text-xs font-medium text-terracotta hover:underline"
                          >
                            Visit community →
                          </Link>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </Marker>
                );
              })}
            </ComposableMap>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-terracotta/60" />
              Sharing community
            </span>
            {discoverable.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-deep-brown border border-white" />
                Open to new neighbors — hover or tap
              </span>
            )}
          </div>
        </div>

        {/* International sidebar */}
        <aside className="bg-card border border-border rounded-sm p-4">
          <h3 className="font-serif font-semibold text-deep-brown text-sm mb-3">
            Around the world
          </h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          ) : intl.length === 0 ? (
            <p className="text-xs text-muted-foreground">Coming soon.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-deep-brown">
              {intl.map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <span className="text-terracotta mt-1">•</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
