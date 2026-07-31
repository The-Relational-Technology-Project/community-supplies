import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  ItemRequest,
  closeItemRequest,
  deleteItemRequest,
  useItemRequests,
} from "@/hooks/useItemRequests";
import { NewRequestDialog } from "./NewRequestDialog";
import { RequestCard } from "./RequestCard";

interface RequestBoardProps {
  /** Called when a member offers to share an item for a request. */
  onFulfill: (request: ItemRequest) => void;
  isSteward?: boolean;
  openNewOnMount?: boolean;
  defaultTitle?: string;
}

export function RequestBoard({
  onFulfill,
  isSteward,
  openNewOnMount = false,
  defaultTitle = "",
}: RequestBoardProps) {
  const { user } = useAuth();
  const { requests, loading, invalidate } = useItemRequests();
  const [filter, setFilter] = useState<"open" | "fulfilled" | "mine" | "all">(
    "open"
  );
  const [dialogOpen, setDialogOpen] = useState(openNewOnMount);

  const visible = useMemo(() => {
    switch (filter) {
      case "open":
        return requests.filter((r) => r.status === "open");
      case "fulfilled":
        return requests.filter((r) => r.status === "fulfilled");
      case "mine":
        return requests.filter((r) => r.requester_id === user?.id);
      default:
        return requests;
    }
  }, [requests, filter, user?.id]);

  const handleClose = async (request: ItemRequest) => {
    try {
      await closeItemRequest(request.id);
      toast.success("Request closed.");
      invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't close that request.");
    }
  };

  const handleDelete = async (request: ItemRequest) => {
    try {
      await deleteItemRequest(request.id);
      toast.success("Request removed.");
      invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't remove that request.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-deep-brown mb-2">
              Request Board
            </h1>
            <p className="text-muted-foreground">
              Can't find something in the library? Ask — a neighbor may have one
              to share.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Post a request
          </Button>
        </div>

        <div className="mb-6 w-full sm:w-48">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="open">Open requests</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="mine">My requests</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-sm" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-sm">
            <MessageSquarePlus className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              {filter === "open"
                ? "No open requests right now."
                : "Nothing here yet."}
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Be the first to ask
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={user?.id}
                isSteward={isSteward}
                onFulfill={onFulfill}
                onClose={handleClose}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTitle={defaultTitle}
        onCreated={invalidate}
      />
    </div>
  );
}
