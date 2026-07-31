import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { ItemRequest } from "@/hooks/useItemRequests";
import { categories } from "@/data/categories";

interface RequestCardProps {
  request: ItemRequest;
  currentUserId?: string;
  isSteward?: boolean;
  onFulfill: (request: ItemRequest) => void;
  onClose: (request: ItemRequest) => void;
  onDelete?: (request: ItemRequest) => void;
}

const categoryName = (id: string | null) =>
  categories.find((c) => c.id === id)?.name || id;

export function RequestCard({
  request,
  currentUserId,
  isSteward,
  onFulfill,
  onClose,
  onDelete,
}: RequestCardProps) {
  const isMine = request.requester_id === currentUserId;
  const isOpen = request.status === "open";

  return (
    <div
      className={`bg-card border border-border rounded-sm p-5 flex flex-col gap-3 ${
        isOpen ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold text-deep-brown break-words">
            {request.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Asked by {isMine ? "you" : request.requester_name || "a neighbor"} ·{" "}
            {formatDistanceToNow(new Date(request.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        {request.status === "fulfilled" ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Shared
          </Badge>
        ) : request.status === "closed" ? (
          <Badge variant="outline" className="shrink-0">
            Closed
          </Badge>
        ) : (
          <Badge className="shrink-0">Open</Badge>
        )}
      </div>

      {request.category && (
        <div>
          <Badge variant="outline">{categoryName(request.category)}</Badge>
        </div>
      )}

      {request.note && (
        <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
          {request.note}
        </p>
      )}

      {request.status === "fulfilled" && request.fulfilled_supply_name && (
        <p className="text-sm text-deep-brown">
          A neighbor shared{" "}
          <span className="font-medium">{request.fulfilled_supply_name}</span> in
          response.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {isOpen && !isMine && (
          <Button size="sm" onClick={() => onFulfill(request)}>
            <PackagePlus className="mr-2 h-4 w-4" />
            I have this — share it
          </Button>
        )}
        {isOpen && isMine && (
          <Button size="sm" variant="outline" onClick={() => onClose(request)}>
            Found it — close request
          </Button>
        )}
        {isSteward && onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => onDelete(request)}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
