"use client";

import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { PomodoroCalendarTaskItem } from "./pomodoro-calendar-task-item";

interface PomodoroCalendarTaskListProps {
  tasks: CalendarEvent[];
  activeEventId?: string;
  isSaving: boolean;
  onSelect: (event: CalendarEvent) => void;
  onReorder: (activeId: string, overId: string) => void;
  onDelete: (event: CalendarEvent) => Promise<void>;
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
    if (!deleteCandidate || isDeleting || isSaving) return;
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
      <div role="list" aria-label="Calendar tasks" className="mt-2 max-h-72 space-y-2 overflow-y-auto p-1">
        {tasks.map((event) => (
          <div role="listitem" key={event.id}><PomodoroCalendarTaskItem
            event={event}
            isActive={activeEventId === event.id}
            isSaving={isSaving}
            onSelect={() => onSelect(event)}
            onMove={(direction) => moveByOne(event.id, direction)}
            onRequestDelete={() => {
              if (isSaving) return;
              setDeleteError("");
              setDeleteCandidate(event);
            }}
          /></div>
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
            <span className="grid size-10 shrink-0 place-items-center rounded-panel border border-border bg-destructive-soft text-destructive-content">
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
                <p role="alert" className="mt-2 text-xs font-medium text-destructive-content">
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
            <Button loading={isDeleting} variant="ghost"
              type="button"
              disabled={isDeleting || isSaving}
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
