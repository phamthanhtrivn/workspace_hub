import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MeetingButton } from "./meeting-form-controls";

interface MeetingEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function MeetingEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: MeetingEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center",
        className,
      )}
    >
      <span className="text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <MeetingButton type="button" className="mt-5" onClick={onAction}>
          {actionLabel}
        </MeetingButton>
      ) : null}
    </div>
  );
}
