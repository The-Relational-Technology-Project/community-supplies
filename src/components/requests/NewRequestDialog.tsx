import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import { useCommunity } from "@/contexts/CommunityContext";
import { createItemRequest } from "@/hooks/useItemRequests";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  onCreated?: () => void;
}

export function NewRequestDialog({
  open,
  onOpenChange,
  defaultTitle = "",
  onCreated,
}: NewRequestDialogProps) {
  const { communityId } = useCommunity();
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitle(defaultTitle);
      setCategory("");
      setNote("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      toast.error("Please describe what you're looking for.");
      return;
    }
    if (trimmed.length > 120) {
      toast.error("Please keep the item name under 120 characters.");
      return;
    }
    if (note.length > 500) {
      toast.error("Please keep your note under 500 characters.");
      return;
    }

    setSaving(true);
    try {
      await createItemRequest({
        communityId,
        title: trimmed,
        category: category || null,
        note,
      });
      toast.success("Request posted — your neighbors can see it now.");
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      console.error("[requests] create failed", err);
      toast.error(err?.message || "Couldn't post your request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Ask the community</DialogTitle>
          <DialogDescription>
            Post what you're looking for. Neighbors who have one can share it
            straight into the library.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request-title">What are you looking for? *</Label>
            <Input
              id="request-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Electric lawn mower"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-category">Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="request-category">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {categories
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-note">
              Anything else? (when you need it, why)
            </Label>
            <Textarea
              id="request-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hoping to borrow one for a weekend yard cleanup in early June."
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
