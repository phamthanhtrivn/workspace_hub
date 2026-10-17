"use client";

import { Button } from "@/components/ui/button";
import { useState, type KeyboardEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ChevronDown,
  EllipsisVertical,
  GripVertical,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { cn } from "@/lib/utils";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { CalendarTaskFocusButton } from "./task-focus-button";

interface PomodoroCalendarTaskListProps {
  tasks: CalendarEvent[];
  activeEventId?: string;
  isSaving: boolean;
  onSelect: (event: CalendarEvent) => void;
  onReorder: (activeId: string, overId: string) => void;
  onDelete: (event: CalendarEvent) => Promise<void>;
}

interface CalendarTaskRowProps {
  event: CalendarEvent;
  isActive: boolean;
  isSaving: boolean;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onRequestDelete: () => void;
}

function CalendarTaskRow({
  event,
  isActive,
  isSaving,
  onSelect,
  onMove,
  onRequestDelete,
}: CalendarTaskRowProps) {
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const note = cleanTaskDescription(event.description);

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
      style={{ transform: CSS.Translate.toString(transform) }}
      onMouseDown={(mouseEvent) => listeners?.onMouseDown?.(mouseEvent)}
      onTouchStart={(touchEvent) => listeners?.onTouchStart?.(touchEvent)}
      className={cn(
        "group flex flex-col cursor-grab touch-pan-y rounded-panel border bg-card transition-[border-color,background-color,opacity,box-shadow] duration-200 active:cursor-grabbing",
        isActive
          ? "border-info bg-info-soft/70"
          : "border-border hover:border-input hover:bg-background",
        isOver && !isDragging && "border-info bg-info-soft/70",
        isDragging && "z-10 opacity-60",
      )}
    >
      <div className="flex items-stretch">
        <Button variant="ghost"
          ref={setActivatorNodeRef}
          type="button"
          disabled={isSaving}
          aria-label={`Drag task ${event.title} to reorder`}
          title="Drag to reorder · use ↑/↓ keys"
          className="h-auto px-0 flex w-8 shrink-0 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-wait disabled:opacity-40"
          {...attributes}
          onKeyDown={handleKeyDown}
        >
          <GripVertical className="size-3.5" />
        </Button>

        <Button variant="ghost"
          type="button"
          disabled={isSaving}
          onClick={onSelect}
          title={note ? `${event.title} — ${note}` : event.title}
          className={cn(
            "h-auto whitespace-normal rounded-none px-0 shadow-none flex min-w-0 flex-1 flex-col justify-center py-2 pl-1 text-left text-xs transition-colors hover:bg-info-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            "pr-1.5",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="truncate font-semibold text-foreground">
              {event.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums transition-colors",
                isActive
                  ? "bg-info-soft/80 text-info"
                  : "bg-muted text-muted-foreground group-hover:bg-accent/60",
              )}
            >
              {new Date(event.startAt).toLocaleTimeString(POMODORO_DISPLAY_LOCALE, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {note && !isNoteExpanded && (
            <div className="mt-1 flex w-full items-center gap-1.5 text-xs text-muted-foreground">
              <StickyNote
                className="size-3 shrink-0 text-warning"
                aria-hidden="true"
              />
              <span className="truncate leading-snug">{note}</span>
            </div>
          )}
        </Button>

        <div className="my-auto mr-1"><CalendarTaskFocusButton event={event} /></div>
        {note && (
          <Button variant="ghost"
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setIsNoteExpanded((prev) => !prev)}
            aria-expanded={isNoteExpanded}
            aria-label={
              isNoteExpanded
                ? `Collapse notes for ${event.title}`
                : `Show all notes for ${event.title}`
            }
            title={
              isNoteExpanded ? "Collapse notes" : `Show all notes: ${note}`
            }
            className={cn(
              "px-0 mr-1.5 my-auto flex size-7 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-warning-soft hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isNoteExpanded && "bg-warning-soft text-warning",
            )}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
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
              title="Actions"
              className="px-0 my-auto mr-1 flex size-7 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EllipsisVertical className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            role="menu"
            aria-label={`Actions for task ${event.title}`}
            align="end"
            sideOffset={6}
            className="z-[120] w-40 rounded-panel border-border p-1.5"
          >
            <Button variant="ghost"
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onRequestDelete();
              }}
              className="h-auto justify-start whitespace-normal px-0 flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-3.5" />
              Delete task
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {note && isNoteExpanded && (
        <div className="mx-2.5 mb-2.5 mt-0.5 rounded-lg border border-border bg-warning-soft/50 px-3 py-2 text-xs leading-relaxed text-foreground">
          <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-warning">
            <StickyNote className="size-3 text-warning" aria-hidden="true" />
            <span>Task notes</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{note}</p>
        </div>
      )}
    </div>
  );
}

export function PomodoroCalendarTaskList({
  tasks,
  activeEventId,
  isSaving,
  onSelect,
  onReorder,
  onDelete,
}: PomodoroCalendarTaskListProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarEvent | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Keep sensor hooks top-level so React Fast Refresh can track their order.
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 6 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 6 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };
  const moveByOne = (eventId: string, direction: -1 | 1) => {
    const currentIndex = tasks.findIndex((event) => event.id === eventId);
    const target = tasks[currentIndex + direction];
    if (target) onReorder(eventId, target.id);
  };
  const handleDelete = async () => {
    if (!deleteCandidate || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await onDelete(deleteCandidate);
      setDeleteCandidate(null);
    } catch {
      setDeleteError("Unable to delete the task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
        {tasks.map((event) => (
          <CalendarTaskRow
            key={event.id}
            event={event}
            isActive={activeEventId === event.id}
            isSaving={isSaving}
            onSelect={() => onSelect(event)}
            onMove={(direction) => moveByOne(event.id, direction)}
            onRequestDelete={() => {
              setDeleteError("");
              setDeleteCandidate(event);
            }}
          />
        ))}
      </div>

      <AlertDialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteCandidate(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent
          role="alertdialog"
          showCloseButton={false}
          className="max-w-sm rounded-panel border border-border bg-card p-5"
        >
          <div className="flex items-start gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-panel border border-border bg-destructive-soft text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base font-semibold leading-snug text-foreground">
                Delete task?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground">
                Are you sure you want to delete “{deleteCandidate?.title}” from Calendar?
              </AlertDialogDescription>
              {deleteError && (
                <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                  {deleteError}
                </p>
              )}
            </div>
          </div>

          <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0 sm:flex-row">
            <Button variant="ghost"
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setDeleteCandidate(null);
                setDeleteError("");
              }}
              className="h-9 rounded-full border border-input bg-card px-4 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button variant="ghost"
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="h-9 rounded-full bg-destructive px-4 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete task"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
