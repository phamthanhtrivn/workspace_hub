"use client";

import { useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Task } from "../../types/project";
import { formatCalendarTaskRange } from "../../utils/calendar-layout.utils";
import { TaskStatusBadge } from "../ui/status-badge";

interface CalendarDayTasksProps {
  dateKey: string;
  tasks: Task[];
  hiddenCount: number;
  compact: boolean;
  onTaskClick?: (task: Task) => void;
  onCreateDate?: (date: string) => void;
}

export default function CalendarDayTasks({
  dateKey, tasks, hiddenCount, compact, onTaskClick, onCreateDate,
}: CalendarDayTasksProps) {
  const [open, setOpen] = useState(false);
  const openingTask = useRef(false);
  const headingId = useId();
  const descriptionId = useId();
  const dateLabel = new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const dayTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
  const description = `${dayTasks.length} ${dayTasks.length === 1 ? "task" : "tasks"} scheduled`;
  if (hiddenCount === 0 && !open) return null;

  const selectTask = (task: Task) => {
    openingTask.current = Boolean(onTaskClick);
    setOpen(false);
    onTaskClick?.(task);
  };
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`View all ${dayTasks.length} tasks for ${dateLabel}; ${hiddenCount} hidden`}
      className="h-8 min-w-0 max-w-full justify-start rounded-control px-1 text-xs font-semibold text-info-content"
    >
      <span className="truncate">{hiddenCount > 0 ? `+${hiddenCount} more` : "View tasks"}</span>
    </Button>
  );
  const taskList = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
      {dayTasks.length === 0 ? (
        <p className="px-2 py-4 text-sm text-muted-foreground">No tasks scheduled for this day.</p>
      ) : (
        <ul className="space-y-1">
          {dayTasks.map((task) => (
            <li key={task.id}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => selectTask(task)}
                className="h-auto w-full min-w-0 flex-col items-start gap-2 whitespace-normal rounded-control p-3 text-left"
              >
                <span className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{task.title}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.status} compact />
                  {task.allDay && <span className="text-xs text-muted-foreground">All day</span>}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{formatCalendarTaskRange(task)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  const createButton = onCreateDate && (
    <div className="shrink-0 border-t border-border p-3">
      <Button type="button" variant="outline" className="w-full" onClick={() => {
        openingTask.current = true;
        setOpen(false);
        onCreateDate(dateKey);
      }}>
        <Plus className="size-4" /> Create task
      </Button>
    </div>
  );

  if (compact) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full max-w-sm">
          <SheetHeader className="shrink-0 border-b border-border pr-12">
            <SheetTitle className="text-base">{dateLabel}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {taskList}
          {createButton}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="flex max-h-[min(30rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0"
        onCloseAutoFocus={(event) => {
          if (openingTask.current) event.preventDefault();
          openingTask.current = false;
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border p-4">
          <div className="min-w-0">
            <h3 id={headingId} className="text-sm font-semibold">{dateLabel}</h3>
            <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close day tasks" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        {taskList}
        {createButton}
      </PopoverContent>
    </Popover>
  );
}
