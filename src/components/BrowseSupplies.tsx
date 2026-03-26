import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplyCard } from "./SupplyCard";
import { ContactModal } from "./ContactModal";
import { Supply } from "@/types/supply";
import { useSupplies } from "@/hooks/useSupplies";
import { Loader2, SlidersHorizontal, Search } from "lucide-react";
import { CategorySidebar } from "./CategorySidebar";
import { categories, isSpecialCategory } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookLibrary } from "./books/BookLibrary";

interface BrowseSuppliesProps {
  searchQuery?: string;
}

export function BrowseSupplies({ searchQuery: externalQuery = "" }: BrowseSuppliesProps) {
  const { supplies, loading } = useSupplies();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(externalQuery);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  useEffect(() => {
    setSearchQuery(externalQuery);
  }, [externalQuery]);

  // Check if a special category (like books) is selected
  const isSpecialCategorySelected = isSpecialCategory(categoryFilter);

  const filteredSupplies = useMemo(() => {
    // Don't compute filtered supplies if viewing a special category
    if (isSpecialCategorySelected) return [];
    
    return supplies.filter((supply) => {
      // Don't show items that are currently lent out
      if (supply.lentOut) return false;
      
      const matchesCategory = categoryFilter === "all" || supply.category === categoryFilter;
      const matchesCondition = conditionFilter === "all" || supply.condition === conditionFilter;
      const matchesAvailability = availabilityFilter === "all" || 
        (availabilityFilter === "available" ? supply.dateAvailable : !supply.dateAvailable);
      const matchesSearch = searchQuery === "" || 
        supply.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supply.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supply.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesCondition && matchesAvailability && matchesSearch;
    });
  }, [supplies, categoryFilter, conditionFilter, availabilityFilter, searchQuery, isSpecialCategorySelected]);

  // Don't show loading state for special categories (they have their own)
  if (loading && !isSpecialCategorySelected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-terracotta" />
          <p className="text-muted-foreground">Loading supplies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <CategorySidebar 
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      </div>
      
      <div className="flex-1 overflow-auto bg-sand/30">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
          {/* Mobile Category & Filter Buttons */}
          <div className="md:hidden flex gap-2 mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 bg-white">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Categories
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sand p-0">
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle className="text-sm">Choose a Category</SheetTitle>
                </SheetHeader>
                <div className="p-4 pt-2">
                  <nav className="space-y-1">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors rounded-sm",
                        categoryFilter === "all" || !categoryFilter
                          ? "bg-terracotta/10 text-terracotta font-medium"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setCategoryFilter(category.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm transition-colors rounded-sm flex items-center gap-2",
                            categoryFilter === category.id
                              ? "bg-terracotta/10 text-terracotta font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {category.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 bg-white">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Search & Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Search & Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search supplies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Condition
                    </label>
                    <Select value={conditionFilter} onValueChange={setConditionFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Availability
                    </label>
                    <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Conditional rendering: Books vs Supplies */}
          {isSpecialCategorySelected && categoryFilter === "books" ? (
            <BookLibrary />
          ) : (
            <>
              {/* Desktop Filters */}
              <div className="hidden md:block bg-white border border-border rounded-sm p-3 mb-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Condition:
                    </label>
                    <Select value={conditionFilter} onValueChange={setConditionFilter}>
                      <SelectTrigger className="h-8 w-32 border-border bg-white text-xs">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Availability:
                    </label>
                    <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                      <SelectTrigger className="h-8 w-32 border-border bg-white text-xs">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              {filteredSupplies.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground">No supplies found matching your criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredSupplies.map((supply) => (
                    <SupplyCard
                      key={supply.id}
                      supply={supply}
                      onViewContact={setSelectedSupply}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ContactModal
        isOpen={!!selectedSupply}
        supply={selectedSupply}
        onClose={() => setSelectedSupply(null)}
      />
    </div>
  );
}
