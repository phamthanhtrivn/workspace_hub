"use client";
import { Button } from "@/components/ui/button";
import type { WorkConversation } from "../types";

export default function WorkConversationList({
  sessions,
  activeId,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
  onSelect,
}: {
  sessions: WorkConversation[];
  activeId?: string;
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section
      id="work-conversation-list"
      aria-label="Conversations"
      className="space-y-4 p-4"
    >
      <h3 className="text-sm font-semibold">Conversations</h3>
      {loading && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading conversations...
        </p>
      )}
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-xs text-muted-foreground">No conversations yet.</p>
      )}
      <ul className="space-y-1">
        {sessions.map((session) => (
          <li key={session.id}>
            <Button
              type="button"
              variant={session.id === activeId ? "secondary" : "ghost"}
              aria-current={session.id === activeId ? "true" : undefined}
              className="h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left"
              onClick={() => onSelect(session.id)}
            >
              <span className="line-clamp-2 w-full whitespace-normal break-words text-sm font-medium">
                {session.title}
              </span>
              <time
                dateTime={session.updatedAt}
                className="text-xs font-normal text-muted-foreground"
              >
                {new Intl.DateTimeFormat("en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(session.updatedAt))}
              </time>
            </Button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={loadingMore}
          onClick={onLoadMore}
        >
          Load more
        </Button>
      )}
    </section>
  );
}
