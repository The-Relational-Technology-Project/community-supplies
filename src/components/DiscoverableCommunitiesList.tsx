import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDiscoverableCommunities } from "@/hooks/useDiscoverableCommunities";

export function DiscoverableCommunitiesList() {
  const { data: communities = [], isLoading } = useDiscoverableCommunities();

  if (isLoading || communities.length === 0) return null;

  const sorted = [...communities].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section id="find-community" className="container mx-auto px-4 pb-12 sm:pb-16 scroll-mt-16">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-deep-brown">
          Communities open to new neighbors
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visit any community page to learn more or request to join.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {sorted.map((c) => {
          const isOpen = c.join_mode === "auto";
          return (
            <Link
              key={c.slug}
              to={`/c/${c.slug}`}
              className="group bg-card border border-border rounded-sm p-4 hover:border-terracotta/60 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-serif font-semibold text-deep-brown text-base leading-tight group-hover:text-terracotta">
                  {c.name}
                </h3>
                <Badge
                  variant="outline"
                  className={
                    isOpen
                      ? "border-terracotta/40 text-terracotta text-[10px] whitespace-nowrap"
                      : "border-deep-brown/30 text-deep-brown text-[10px] whitespace-nowrap"
                  }
                >
                  {isOpen ? "Open" : "Apply"}
                </Badge>
              </div>
              {c.public_location_label && (
                <p className="text-xs text-muted-foreground mb-3">
                  {c.public_location_label}
                </p>
              )}
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-terracotta">
                Visit community <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
