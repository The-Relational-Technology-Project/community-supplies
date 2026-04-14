import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooks } from "@/hooks/useBooks";
import { BookCard } from "./BookCard";
import { BookContactModal } from "./BookContactModal";
import { Book } from "@/types/book";
import { Loader2, Search, BookOpen, Plus } from "lucide-react";

export function BookLibrary() {
  const navigate = useNavigate();
  const { communitySlug } = useCommunity();
  const { books, loading } = useBooks();
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Don't show lent out books
      if (book.lentOut) return false;

      const matchesCondition = conditionFilter === "all" || book.condition === conditionFilter;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        book.title.toLowerCase().includes(searchLower) ||
        (book.author?.toLowerCase().includes(searchLower) ?? false);

      return matchesCondition && matchesSearch;
    });
  }, [books, conditionFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-terracotta" />
          <p className="text-muted-foreground">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-terracotta" />
          <h2 className="text-xl font-semibold text-foreground">Community Book Library</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/my-books")}
        >
          <Plus className="h-4 w-4 mr-2" />
          My Books
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-border rounded-sm p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Condition:</label>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-32">
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
      </div>

      {/* Results */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">No books found matching your search.</p>
          <p className="text-sm text-muted-foreground mt-2">
            {books.length === 0 
              ? "The community library is empty. Be the first to add books!" 
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-sm shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 divide-x divide-border/50">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => setSelectedBook(book)}
              />
            ))}
          </div>
        </div>
      )}

      <BookContactModal
        isOpen={!!selectedBook}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
