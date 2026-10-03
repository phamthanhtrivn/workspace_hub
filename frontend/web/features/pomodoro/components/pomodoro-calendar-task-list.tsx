"use client";

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
        "group flex flex-col cursor-grab touch-pan-y rounded-xl border bg-white transition-[border-color,background-color,opacity,box-shadow] duration-200 active:cursor-grabbing",
        isActive
          ? "border-blue-300 bg-blue-50/70 shadow-2xs"
          : "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/40",
        isOver && !isDragging && "border-blue-400 bg-blue-50/70",
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <div className="flex items-stretch">
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={isSaving}
          aria-label={`Drag task ${event.title} to reorder`}
          title="Drag to reorder · use ↑/↓ keys"
          className="flex w-8 shrink-0 items-center justify-center rounded-l-xl text-slate-400 transition-colors hover:bg-slate-100/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-40"
          {...attributes}
          onKeyDown={handleKeyDown}
        >
          <GripVertical className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={onSelect}
          title={note ? `${event.title} — ${note}` : event.title}
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center py-2 pl-1 text-left text-xs transition-colors hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300",
            "pr-1.5",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="truncate font-semibold text-slate-800">
              {event.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                isActive
                  ? "bg-blue-100/80 text-blue-800"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/60",
              )}
            >
              {new Date(event.startAt).toLocaleTimeString(POMODORO_DISPLAY_LOCALE, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {note && !isNoteExpanded && (
            <div className="mt-1 flex w-full items-center gap-1.5 text-[11px] text-slate-500">
              <StickyNote
                className="size-3 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <span className="truncate leading-snug">{note}</span>
            </div>
          )}
        </button>

        {note && (
          <button
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
              "mr-1.5 my-auto flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              isNoteExpanded && "bg-amber-50 text-amber-600",
            )}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                isNoteExpanded && "rotate-180",
              )}
            />
          </button>
        )}

        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              aria-label={`Actions for task ${event.title}`}
              title="Actions"
              className="my-auto mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <EllipsisVertical className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            role="menu"
            aria-label={`Actions for task ${event.title}`}
            align="end"
            sideOffset={6}
            className="w-40 rounded-xl border-slate-200 p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onRequestDelete();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              <Trash2 className="size-3.5" />
              Delete task
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {note && isNoteExpanded && (
        <div className="mx-2.5 mb-2.5 mt-0.5 rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-[11px] leading-relaxed text-slate-700">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <StickyNote className="size-3 text-amber-500" aria-hidden="true" />
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
          className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        >
          <div className="flex items-start gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base font-bold leading-snug text-slate-900">
                Delete task?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                Are you sure you want to delete “{deleteCandidate?.title}” from Calendar?
              </AlertDialogDescription>
              {deleteError && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {deleteError}
                </p>
              )}
            </div>
          </div>

          <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0 sm:flex-row">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setDeleteCandidate(null);
                setDeleteError("");
              }}
              className="h-9 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="h-9 rounded-full bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete task"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
