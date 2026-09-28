"use client";

import type { KeyboardEvent } from "react";
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
import { GripVertical } from "lucide-react";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { cn } from "@/lib/utils";

interface PomodoroCalendarTaskListProps {
  tasks: CalendarEvent[];
  activeEventId?: string;
  isSaving: boolean;
  onSelect: (event: CalendarEvent) => void;
  onReorder: (activeId: string, overId: string) => void;
}

interface CalendarTaskRowProps {
  event: CalendarEvent;
  isActive: boolean;
  isSaving: boolean;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
}

function CalendarTaskRow({
  event,
  isActive,
  isSaving,
  onSelect,
  onMove,
}: CalendarTaskRowProps) {
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
        "group flex cursor-grab touch-pan-y items-center rounded-lg border bg-white transition-[border-color,background-color,opacity] active:cursor-grabbing",
        isActive ? "border-blue-300 bg-blue-50" : "border-slate-200",
        isOver && !isDragging && "border-blue-400 bg-blue-50/70",
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={isSaving}
        aria-label={`Kéo task ${event.title} để đổi thứ tự`}
        title="Kéo để đổi thứ tự · dùng phím ↑/↓"
        className="flex size-8 shrink-0 items-center justify-center rounded-l-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-40"
        {...attributes}
        onKeyDown={handleKeyDown}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between rounded-r-lg py-2 pl-1 pr-3 text-left text-xs hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
      >
        <span className="truncate font-medium text-slate-800">{event.title}</span>
        <span className="ml-3 shrink-0 text-slate-500">
          {new Date(event.startAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </button>
    </div>
  );
}

export function PomodoroCalendarTaskList({
  tasks,
  activeEventId,
  isSaving,
  onSelect,
  onReorder,
}: PomodoroCalendarTaskListProps) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {tasks.map((event) => (
          <CalendarTaskRow
            key={event.id}
            event={event}
            isActive={activeEventId === event.id}
            isSaving={isSaving}
            onSelect={() => onSelect(event)}
            onMove={(direction) => moveByOne(event.id, direction)}
          />
        ))}
      </div>
    </DndContext>
  );
}
