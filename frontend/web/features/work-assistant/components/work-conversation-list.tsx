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
      aria-label="Các cuộc trò chuyện trong phạm vi này"
      className="space-y-2 border-b p-4"
    >
      <h3 className="text-sm font-semibold">
        Cuộc trò chuyện trong phạm vi này
      </h3>
      {loading && (
        <p role="status" className="text-xs text-muted-foreground">
          Đang tải danh sách…
        </p>
      )}
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có cuộc trò chuyện nào.
        </p>
      )}
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {sessions.map((session) => (
          <li key={session.id}>
            <Button
              type="button"
              variant={session.id === activeId ? "secondary" : "ghost"}
              aria-current={session.id === activeId ? "true" : undefined}
              className="h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left"
              onClick={() => onSelect(session.id)}
            >
              <span className="line-clamp-2 w-full whitespace-normal break-words text-xs font-medium">
                {session.title}
              </span>
              <time
                dateTime={session.updatedAt}
                className="text-[10px] font-normal text-muted-foreground"
              >
                {new Intl.DateTimeFormat("vi-VN", {
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
          Xem cuộc trò chuyện cũ hơn
        </Button>
      )}
    </section>
  );
}
