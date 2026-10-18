import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


export function DashboardPanel({
  title,
  href,
  children,
  description,
  tone = "default",
  className,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  description?: string;
  tone?: "default" | "focus";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border",
        tone === "focus" ? "bg-secondary" : "bg-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-4">
        <div className="min-w-0 flex-1 basis-40 break-words">
          <h2 className="text-section-title font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`View all: ${title}`}
            className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-control text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 sm:min-h-6 [@media(pointer:coarse)]:min-h-11"
          >
            View all <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function QueryFeedback({
  query,
  label,
}: {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  label: string;
}) {
  if (query.isError)
    return (
      <div
        role="status"
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive-content"
      >
        <span className="min-w-0 break-words">Could not load {label}.</span>
        <Button variant="unstyled"
          type="button"
          onClick={() => void query.refetch()}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-control px-2 py-1 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 [@media(pointer:coarse)]:min-h-11"
        >
          <RefreshCw size={13} /> Retry
        </Button>
      </div>
    );
  if (query.isPending)
    return (
      <div
        role="status"
        aria-label={`Loading ${label}`}
        className="mb-3 space-y-3"
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  return null;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="break-words py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
