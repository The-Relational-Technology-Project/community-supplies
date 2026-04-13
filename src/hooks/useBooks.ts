import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Book, BookInsert } from "@/types/book";
import { useCommunity } from "@/contexts/CommunityContext";

interface RawBook {
  id: string;
  title: string;
  author: string | null;
  genre: string | null;
  condition: string;
  house_rules: string[] | null;
  owner_id: string;
  owner_name: string;
  owner_email: string | null;
  lent_out: boolean | null;
  lender_notes: string | null;
  created_at: string;
  updated_at: string;
}

const transformBook = (raw: RawBook): Book => ({
  id: raw.id,
  title: raw.title,
  author: raw.author,
  genre: raw.genre,
  condition: raw.condition,
  houseRules: raw.house_rules || [],
  ownerId: raw.owner_id,
  ownerName: raw.owner_name,
  ownerEmail: raw.owner_email,
  lentOut: raw.lent_out || false,
  lenderNotes: raw.lender_notes,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export function useBooks() {
  const queryClient = useQueryClient();
  const { communityId } = useCommunity();

  const { data: books = [], isLoading: loading, error } = useQuery({
    queryKey: ["books", communityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_books_with_owners", { p_community_id: communityId });
      if (error) throw error;
      return (data as RawBook[]).map(transformBook);
    },
  });

  const addBooks = useMutation({
    mutationFn: async (newBooks: BookInsert[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to add books");

      const booksToInsert = newBooks.map(book => ({
        title: book.title,
        author: book.author || null,
        genre: book.genre || null,
        condition: book.condition,
        house_rules: book.house_rules || [],
        lender_notes: book.lender_notes || null,
        owner_id: user.id,
      }));

      const { data, error } = await supabase
        .from("books")
        .insert(booksToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
    },
  });

  const updateBook = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BookInsert & { lent_out?: boolean }> }) => {
      const { data, error } = await supabase
        .from("books")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
    },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
    },
  });

  return {
    books,
    loading,
    error,
    addBooks,
    updateBook,
    deleteBook,
  };
}

export function useMyBooks() {
  const { data: books = [], isLoading: loading, error } = useQuery({
    queryKey: ["my-books"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", user.id)
        .order("title", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return { books, loading, error };
}
