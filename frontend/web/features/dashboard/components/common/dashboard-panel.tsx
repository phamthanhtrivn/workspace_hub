import { RefreshCw } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ViewAllAction } from "@/components/common/view-all-action";
import { cn } from "@/lib/utils";

export const DASHBOARD_PANEL_HEIGHT = "h-[30rem] @min-[640px]/dashboard:h-[36rem]";
export const DASHBOARD_CHART_PANEL_HEIGHT = "h-[28rem] @min-[640px]/dashboard:h-[30rem]";
export const DASHBOARD_WORKLOAD_PANEL_HEIGHT = "h-[26rem] @min-[640px]/dashboard:h-[26rem]";
export const DASHBOARD_ACTIVITY_PANEL_HEIGHT = "h-[28rem] @min-[640px]/dashboard:h-[24rem]";
export const DASHBOARD_FOCUS_PANEL_HEIGHT = "h-[30rem] @min-[640px]/dashboard:h-[28rem]";

export function DashboardPanel({
  title,
  href,
  children,
  description,
  tone = "default",
  className,
  toolbar,
  footer,
  bodyRef,
  height = "bounded",
}: {
  title: string;
  href?: string;
  children: ReactNode;
  description?: string;
  tone?: "default" | "focus";
  className?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  height?: "bounded" | "content";
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border",
        height === "bounded" && DASHBOARD_PANEL_HEIGHT,
        tone === "focus" ? "bg-secondary" : "bg-card",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-4">
        <div className="min-w-0 flex-1 basis-40 break-words">
          <h2 className="text-section-title font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {href && (
          <ViewAllAction label="View all" href={href} aria-label={`View all: ${title}`} />
        )}
      </div>
      {toolbar && <div className="shrink-0 border-b border-border px-4 py-3">{toolbar}</div>}
      <div
        ref={bodyRef}
        data-dashboard-panel-body
        role={height === "bounded" ? "region" : undefined}
        aria-label={height === "bounded" ? `${title} content` : undefined}
        tabIndex={height === "bounded" ? 0 : undefined}
        className={cn("min-h-0 min-w-0 p-4", height === "bounded" && "relative flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring")}
      >{children}</div>
      {footer && <div className="shrink-0 border-t border-border px-4 py-3">{footer}</div>}
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
        <Button variant="link"
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
