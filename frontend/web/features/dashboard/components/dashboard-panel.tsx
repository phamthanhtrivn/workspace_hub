import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPanel({
  title,
  href,
  children,
  description,
  tone = "default",
}: {
  title: string;
  href?: string;
  children: ReactNode;
  description?: string;
  tone?: "default" | "focus";
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border border-border ${tone === "focus" ? "bg-primary/5" : "bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div>
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
            className="flex min-h-6 shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-primary"
          >
            View all <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
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
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive"
      >
        <span>Could not load {label}.</span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="flex items-center gap-1 rounded px-2 py-1 font-semibold hover:bg-destructive-soft"
        >
          <RefreshCw size={13} /> Retry
        </button>
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
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
