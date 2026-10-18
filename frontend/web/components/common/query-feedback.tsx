"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface QueryFeedbackProps {
  label: string;
  pending?: boolean;
  error?: boolean;
  retrying?: boolean;
  onRetry?: () => unknown;
}

/** Feedback only; each feature owns its content and genuine empty state. */
export function QueryFeedback({ label, pending, error, retrying, onRetry }: QueryFeedbackProps) {
  if (error) return <div role="alert" className="flex min-w-0 flex-wrap items-center gap-3 rounded-control bg-destructive-soft p-3 text-sm text-destructive-content">
    <span className="min-w-0 flex-1 break-words">Could not load {label}. Please try again.</span>
    {onRetry && <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={() => void onRetry()}>
      <RefreshCw aria-hidden className={retrying ? "animate-spin" : undefined} />{retrying ? "Retrying…" : "Retry"}
    </Button>}
  </div>;
  if (pending) return <p role="status" className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 aria-hidden className="size-4 animate-spin" />Loading {label}…</p>;
  return null;
}
