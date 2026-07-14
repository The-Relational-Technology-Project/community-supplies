import { Book } from "@/types/book";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  const isLentOut = !!book.lentOut;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-transparent hover:bg-sand/30 rounded-sm px-3 py-2.5 hover:shadow-sm transition-all duration-200 group border-b border-border/30 last:border-b-0",
        isLentOut && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm text-foreground leading-snug group-hover:text-terracotta transition-colors flex-1">
          {book.title}
        </h3>
        {isLentOut && (
          <span className="shrink-0 bg-deep-brown/90 text-white text-[9px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded-sm">
            Lent
          </span>
        )}
      </div>
      {book.author && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {book.author}
        </p>
      )}
    </button>
  );
}
