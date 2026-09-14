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
        "flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-lg bg-blue-50 text-[#0052CC] ring-1 ring-blue-100">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-base font-black text-[#172B4D]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-500">
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
