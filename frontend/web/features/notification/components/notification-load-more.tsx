import { Button } from "@/components/ui/button";

interface NotificationLoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  fetching: boolean;
  error: boolean;
  onLoadMore: () => void;
}

export function NotificationLoadMore({
  hasMore,
  loading,
  fetching,
  error,
  onLoadMore,
}: NotificationLoadMoreProps) {
  if (!hasMore) return null;

  return (
    <div className="space-y-2 border-t border-border bg-background px-3 py-3">
      {error && (
        <p
          role="alert"
          className="text-center text-xs text-destructive-content"
        >
          Could not load more notifications. Please try again.
        </p>
      )}
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          loading={loading}
          disabled={fetching}
          onClick={onLoadMore}
        >
          {loading ? "Loading more…" : error ? "Retry load more" : "Load more"}
        </Button>
      )}
    </div>
  );
}
