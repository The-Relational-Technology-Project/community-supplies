import { Search, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AuthButtons } from "./auth/AuthButtons";
import { UserProfile } from "./auth/UserProfile";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CatalogHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
  onNavigate?: (tab: string) => void;
}

export const CatalogHeader = ({ onSearch, searchQuery = "", onNavigate }: CatalogHeaderProps) => {
  const { user } = useAuth();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const { communityName } = useCommunity();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sand">
      <div className="container mx-auto px-3 md:px-6 h-16 flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => onNavigate?.("home")}
          className="text-base md:text-xl font-serif font-bold text-deep-brown hover:text-terracotta transition-colors truncate min-w-0"
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

        {/* Mobile: single "Add" dropdown to keep the user profile visible */}
        <div className="md:hidden ml-auto flex items-center gap-1 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-2.5"
              >
                <Plus className="h-4 w-4" />
                <span className="ml-1">Add</span>
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate?.("add")}>
                Add one item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("bulk-add")}>
                Bulk add
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("requests")}>
                Request Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? <UserProfile /> : <AuthButtons onSuccess={() => onNavigate?.('browse')} />}
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
          <Button
            onClick={() => onNavigate?.("requests")}
            variant="ghost"
          >
            Requests
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? <UserProfile /> : <AuthButtons onSuccess={() => onNavigate?.('browse')} />}
        </div>
      </div>
    </header>
  );
};
