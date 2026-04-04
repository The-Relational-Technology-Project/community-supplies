import { Loader2, Globe, ArrowRight } from "lucide-react";
import { CrossCommunityResult } from "@/hooks/useCrossCommunitySearch";

interface CrossCommunityResultsProps {
  results: CrossCommunityResult[];
  isSearching: boolean;
  hasSearched: boolean;
}

export function CrossCommunityResults({ results, isSearching, hasSearched }: CrossCommunityResultsProps) {
  if (isSearching) {
    return (
      <div className="mt-6 text-center py-6">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking nearby communities...</p>
      </div>
    );
  }

  if (!hasSearched || results.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Also available nearby
      </h3>
      {results.map((result) => (
        <div
          key={result.communityName}
          className="bg-sand/50 border border-border rounded-sm p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-terracotta" />
            <span className="font-serif font-semibold text-deep-brown">
              {result.communityName}
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {result.categories.map((cat) => (
              <li key={cat.category} className="text-sm text-muted-foreground">
                {cat.count} {cat.count === 1 ? "item" : "items"} in{" "}
                <span className="text-foreground capitalize">{cat.category}</span>
              </li>
            ))}
          </ul>
          <a
            href={result.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-terracotta hover:text-terracotta/80 font-medium transition-colors"
          >
            Want to see full details? Join {result.communityName}
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      ))}
    </div>
  );
}
