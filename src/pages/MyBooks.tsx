import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMyBooks, useBooks } from "@/hooks/useBooks";
import { Edit2, Save, X, Trash2, ArrowLeft, FileText, BookOpen, Plus } from "lucide-react";
import { CatalogHeader } from "@/components/CatalogHeader";
import { Footer } from "@/components/Footer";
import { AddBooks } from "@/components/books/AddBooks";

export default function MyBooks() {
  const navigate = useNavigate();
  const { communitySlug } = useCommunity();
  const { books, loading } = useMyBooks();
  const { updateBook, deleteBook } = useBooks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotesBook, setCurrentNotesBook] = useState<any>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleEdit = (book: any) => {
    setEditingId(book.id);
    setEditForm(book);
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;

    try {
      await updateBook.mutateAsync({
        id: editingId,
        updates: {
          title: editForm.title,
          author: editForm.author,
          condition: editForm.condition,
          house_rules: editForm.house_rules,
        },
      });

      toast({
        title: "Book updated",
        description: "Your book has been updated successfully.",
      });

      setEditingId(null);
      setEditForm({});
    } catch (error: any) {
      toast({
        title: "Error updating book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this book from your library?")) return;

    try {
      await deleteBook.mutateAsync(id);

      toast({
        title: "Book removed",
        description: "Your book has been removed from the library.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleGoBack = () => {
    navigate(`/c/${communitySlug}?tab=browse`);
  };

  const handleTabChange = (tab: string) => {
    navigate(`/c/${communitySlug}?tab=${tab}`);
  };

  const handleToggleLentOut = async (book: any) => {
    try {
      await updateBook.mutateAsync({
        id: book.id,
        updates: { lent_out: !book.lent_out },
      });

      toast({
        title: book.lent_out ? "Book marked as available" : "Book marked as lent out",
        description: "Status updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenNotes = (book: any) => {
    setCurrentNotesBook(book);
    setTempNotes(book.lender_notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!currentNotesBook) return;

    try {
      await updateBook.mutateAsync({
        id: currentNotesBook.id,
        updates: { lender_notes: tempNotes },
      });

      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully.",
      });

      setNotesDialogOpen(false);
      setCurrentNotesBook(null);
      setTempNotes("");
    } catch (error: any) {
      toast({
        title: "Error saving notes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CatalogHeader onNavigate={handleTabChange} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading your books...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CatalogHeader onNavigate={handleTabChange} />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-terracotta" />
            <h1 className="text-3xl font-bold">My Books ({books.length})</h1>
          </div>
        </div>

        {/* Add Books Button */}
        <div className="mb-6">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-terracotta hover:bg-terracotta/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Books
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Books to Library</DialogTitle>
              </DialogHeader>
              <AddBooks onComplete={() => setAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {books.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">You haven't added any books yet.</p>
              <Button onClick={() => setAddDialogOpen(true)}>Add Your First Books</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book: any) => (
              <Card key={book.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  {editingId === book.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Book title"
                      />
                      <Input
                        value={editForm.author || ""}
                        onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                        placeholder="Author"
                      />
                      <Select
                        value={editForm.condition || ""}
                        onValueChange={(value) => setEditForm({ ...editForm, condition: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-tight line-clamp-2">
                          {book.title}
                        </CardTitle>
                        {book.author && (
                          <p className="text-sm text-muted-foreground italic mt-1 line-clamp-1">
                            by {book.author}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Badge
                          variant={book.condition === "excellent" ? "default" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {book.condition}
                        </Badge>
                        <Badge variant={book.lent_out ? "destructive" : "outline"} className="text-xs">
                          {book.lent_out ? "lent" : "available"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  {editingId === book.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={(editForm.house_rules || []).join("\n")}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            house_rules: e.target.value.split("\n").filter(Boolean),
                          })
                        }
                        placeholder="Borrowing guidelines (one per line)"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSave} className="flex-1" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancel} size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {book.house_rules && book.house_rules.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Guidelines:</span>{" "}
                          {book.house_rules.join(", ")}
                        </div>
                      )}

                      {book.lender_notes && (
                        <div className="bg-muted p-2 rounded-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                          <p className="text-xs whitespace-pre-wrap">{book.lender_notes}</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                          <Button
                            variant={book.lent_out ? "default" : "outline"}
                            onClick={() => handleToggleLentOut(book)}
                            className="flex-1"
                            size="sm"
                          >
                            {book.lent_out ? "Mark Available" : "Mark Lent"}
                          </Button>
                          <Dialog
                            open={notesDialogOpen && currentNotesBook?.id === book.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setNotesDialogOpen(false);
                                setCurrentNotesBook(null);
                                setTempNotes("");
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleOpenNotes(book)}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Lender Notes for {book.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                  Add notes about who you lent this to, expected return date, etc.
                                </p>
                                <Textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="e.g., Lent to Sarah on 12/15. Expected return: 12/30"
                                  rows={6}
                                />
                                <Button onClick={handleSaveNotes} className="w-full">
                                  Save Notes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleEdit(book)}
                            className="flex-1"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(book.id)}
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
