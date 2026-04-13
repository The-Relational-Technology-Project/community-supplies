import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthButtons } from "./auth/AuthButtons";
import { UserProfile } from "./auth/UserProfile";
import { useCommunity } from "@/contexts/CommunityContext";

interface CatalogHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
  onNavigate?: (tab: string) => void;
}

export const CatalogHeader = ({ onSearch, searchQuery = "", onNavigate }: CatalogHeaderProps) => {
  const [user, setUser] = useState<any>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const { communityName } = useCommunity();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sand">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
        <button 
          onClick={() => onNavigate?.("home")}
          className="text-lg md:text-xl font-serif font-bold text-deep-brown hover:text-terracotta transition-colors whitespace-nowrap"
        >
          {communityName}
        </button>

        {/* Desktop Search - hidden on mobile */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for tools, gear, supplies..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="pl-10 bg-white border-border"
            />
          </div>
          <Button type="submit" size="sm" className="h-10">
            Search
          </Button>
          {localQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => {
                setLocalQuery("");
                onSearch?.("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Mobile: Add Item Dropdown */}
        <div className="md:hidden flex-1 flex justify-end gap-2">
          <Button 
            onClick={() => onNavigate?.("add")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            Add Item
          </Button>
          <Button 
            onClick={() => onNavigate?.("bulk-add")}
            variant="outline"
            size="sm"
          >
            Bulk Add
          </Button>
        </div>

        {/* Desktop: Add Item Buttons */}
        <div className="hidden md:flex gap-2">
          <Button 
            onClick={() => onNavigate?.("add")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Add Item
          </Button>
          <Button 
            onClick={() => onNavigate?.("bulk-add")}
            variant="outline"
          >
            Bulk Add
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {user ? <UserProfile /> : <AuthButtons onSuccess={() => onNavigate?.('browse')} />}
        </div>
      </div>
    </header>
  );
};
