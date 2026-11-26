"use client";

import { useState } from "react";
import { ChevronRight, Circle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FocusPickerTask } from "../types/focus-picker";
import { toCalendarFocusTask, toProjectFocusTask } from "../utils/focus-task";
import { PomodoroTaskSourceBadge } from "./pomodoro-task-source-badge";
import { PomodoroFocusTaskDetailsDialog } from "./pomodoro-focus-task-details-dialog";

export function PomodoroFocusTaskRow({
  entry,
  current,
  running,
  paused,
  disabled,
  onSelect,
  onDelete,
}: {
  entry: FocusPickerTask;
  current: boolean;
  running: boolean;
  paused: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const target =
    entry.source === "calendar"
      ? toCalendarFocusTask(entry.event)
      : toProjectFocusTask(entry.task, entry.project);

  return (
    <li
      aria-current={current || undefined}
      className={cn(
        "min-w-0 rounded-control border transition-colors focus-within:border-ring motion-reduce:transition-none",
        current
          ? "border-wsh-accent bg-wsh-ice-soft text-wsh-heading"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-1 px-1">
        <Button
          type="button"
          variant="unstyled"
          disabled={disabled}
          aria-pressed={current}
          onClick={onSelect}
          aria-label={
            (current
              ? "Remove task from session: "
              : "Select task for session: ") + target.title
          }
          title={current ? "Remove from session" : "Select for session"}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-control p-0 focus-visible:ring-inset",
            current && "text-wsh-primary-hover dark:text-wsh-accent",
          )}
        >
          {current ? (
            <CircleDot
              aria-hidden="true"
              className="size-5 text-wsh-primary-hover dark:text-wsh-accent"
            />
          ) : (
            <Circle
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          )}
        </Button>
        <Button
          type="button"
          variant="unstyled"
          onClick={() => setDetailsOpen(true)}
          aria-haspopup="dialog"
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control py-2.5 pr-3 text-left focus-visible:ring-inset"
          aria-label={"View details: " + target.title}
        >
          <span className="min-w-0 flex-1 space-y-1">
            <span
              title={target.title}
              className="block truncate text-xs font-semibold text-foreground"
            >
              {target.title}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <PomodoroTaskSourceBadge
                task={target}
                project={entry.source === "project" ? entry.project : undefined}
              />
              {current && (
                <span className="text-[11px] font-semibold text-wsh-primary-hover dark:text-wsh-accent">
                  {running ? "Focusing" : paused ? "Paused" : "Selected"}
                </span>
              )}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Button>
      </div>
      {detailsOpen && (
        <PomodoroFocusTaskDetailsDialog
          entry={entry}
          current={current}
          disabled={disabled}
          onSelect={onSelect}
          onDelete={onDelete}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </li>
  );
}
