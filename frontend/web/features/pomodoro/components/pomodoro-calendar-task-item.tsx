"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Check, ChevronDown, EllipsisVertical, GripVertical, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { cn } from "@/lib/utils";
import { formatPomodoroTaskSchedule } from "../utils/pomodoro-task-schedule";
import { isCalendarFocusOverdue } from "../utils/focus-task";
import { POMODORO_TASK_COPY as copy } from "../constants/pomodoro-task";
import { CalendarTaskFocusButton } from "./task-focus-button";

interface CalendarTaskRowProps {
  event: CalendarEvent;
  isActive: boolean;
  isSaving: boolean;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onRequestDelete: () => void;
}

export function PomodoroCalendarTaskItem({
  event,
  isActive,
  isSaving,
  onSelect,
  onMove,
  onRequestDelete,
}: CalendarTaskRowProps) {
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const notesId = useId();
  const note = cleanTaskDescription(event.description);
  const schedule = formatPomodoroTaskSchedule(event);

  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: event.id, disabled: isSaving });
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: event.id,
    disabled: isSaving,
  });
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  };
  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLButtonElement>) => {
    if (keyboardEvent.key === "ArrowUp" || keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      onMove(keyboardEvent.key === "ArrowUp" ? -1 : 1);
      return;
    }
    listeners?.onKeyDown?.(keyboardEvent);
  };

  return (
    <div
      ref={setNodeRef}
      aria-current={isActive || undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "@container/focus-row group relative flex min-w-0 flex-col rounded-control border bg-card transition-colors duration-150 motion-reduce:transition-none",
        isActive
          ? "border-info-outline bg-info-soft/40 hover:bg-info-soft/70 focus-within:bg-info-soft/70"
          : "border-border hover:border-input hover:bg-muted/50 focus-within:border-input focus-within:bg-muted/50",
        isOver && !isDragging && "border-info-outline bg-info-soft/70",
        isDragging && "z-10 opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-stretch">
        <Button variant="ghost"
          ref={setActivatorNodeRef}
          type="button"
          disabled={isSaving}
          aria-label={`Drag task ${event.title} to reorder`}
          title="Drag to reorder · use ↑/↓ keys"
          className="h-auto w-8 self-stretch rounded-l-control rounded-r-none px-0 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-inset disabled:cursor-wait motion-reduce:transition-none"
          {...attributes}
          {...listeners}
          onKeyDown={handleKeyDown}
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </Button>

        <Button variant="ghost"
          type="button"
          disabled={isSaving}
          onClick={onSelect}
          title={event.title}
          aria-label={`Focus on ${event.title}`}
          className="h-auto min-w-0 flex-1 basis-[calc(100%-2rem)] flex-col items-start gap-0 whitespace-normal rounded-control px-2 py-3 text-left font-normal text-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-inset motion-reduce:transition-none @min-[500px]/focus-row:basis-0"
        >
          <span className="flex w-full min-w-0 flex-col items-start gap-2">
            <span title={event.title} className="max-w-full truncate text-sm font-semibold leading-snug text-foreground">
              {event.title}
            </span>
            {(isCalendarFocusOverdue(event) || isActive) && <span className="flex max-w-full flex-wrap items-center gap-1.5">
              {isCalendarFocusOverdue(event) && <Badge variant="secondary" className="bg-warning-soft font-medium text-warning-content">{copy.overdue}</Badge>}
              {isActive && <Badge variant="outline" className="border-info-outline font-medium text-info-content"><Check aria-hidden="true" />{copy.currentTask}</Badge>}
            </span>}
            <span title={schedule} className="flex max-w-full items-start gap-1.5 text-xs leading-relaxed text-muted-foreground tabular-nums">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-words">{schedule}</span>
            </span>
          </span>

          {note && !isNoteExpanded && (
            <span className="mt-2 flex w-full items-center gap-1.5 text-xs text-muted-foreground">
              <StickyNote
                className="size-3 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate leading-snug">{note}</span>
            </span>
          )}
        </Button>

        <div className="ml-8 flex min-w-0 basis-[calc(100%-2rem)] flex-wrap items-center justify-end gap-1 border-t border-border/60 py-2 pr-2 @min-[500px]/focus-row:ml-0 @min-[500px]/focus-row:basis-auto @min-[500px]/focus-row:self-center @min-[500px]/focus-row:border-t-0">
        <CalendarTaskFocusButton event={event} />
        {note && (
          <Button variant="ghost"
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setIsNoteExpanded((prev) => !prev)}
            aria-expanded={isNoteExpanded}
            aria-controls={isNoteExpanded ? notesId : undefined}
            aria-label={
              isNoteExpanded
                ? `Collapse notes for ${event.title}`
                : `Show all notes for ${event.title}`
            }
            title={
              isNoteExpanded ? "Collapse notes" : `Show all notes: ${note}`
            }
            className={cn(
              "size-8 shrink-0 rounded-control px-0 text-muted-foreground hover:bg-muted hover:text-foreground motion-reduce:transition-none",
              isNoteExpanded && "bg-muted text-foreground",
            )}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                isNoteExpanded && "rotate-180",
              )}
            />
          </Button>
        )}

        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost"
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              aria-label={`Actions for task ${event.title}`}
              disabled={isSaving}
              title="Actions"
              className="size-8 shrink-0 rounded-control px-0 text-muted-foreground hover:bg-muted hover:text-foreground motion-reduce:transition-none"
            >
              <EllipsisVertical className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            role="menu"
            aria-label={`Actions for task ${event.title}`}
            align="end"
            sideOffset={6}
            className="w-40 rounded-panel border-border p-1.5"
          >
            <Button variant="ghost"
              type="button"
              role="menuitem"
              disabled={isSaving}
              onClick={() => {
                setIsMenuOpen(false);
                onRequestDelete();
              }}
              className="h-auto justify-start whitespace-normal px-0 flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs font-semibold text-destructive-content transition-colors hover:bg-destructive-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-3.5" />
              Delete task
            </Button>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {note && isNoteExpanded && (
        <div id={notesId} role="region" aria-label={`Notes for ${event.title}`} className="border-t border-border px-3 py-3 text-xs leading-relaxed text-foreground">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <StickyNote className="size-3" aria-hidden="true" />
            <span>Task notes</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{note}</p>
        </div>
      )}
    </div>
  );
}

