"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { type Task } from "@/features/project/types/project";
import { useCalendarGrid } from "@/features/project/hooks/use-calendar-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPriorityIcon } from "../ui/task-card";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { CALENDAR_TASK_STATUS_STYLES, PROJECT_CALENDAR_DESKTOP_QUERY } from "../../constants/calendar-view.constants";
import ProjectCalendarWeek from "../calendar/project-calendar-week";

export { buildWeekTaskSegments } from "../../utils/calendar-layout.utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

function DraggableUnscheduledTask({
  task,
  canDrag,
  onClick,
}: {
  task: Task;
  canDrag: boolean;
  onClick?: () => void;
}) {
  const priorityIcon = getPriorityIcon(task.priority);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
    data: { task },
  });

  return (
    <div
      data-ui-interaction-exception="Drag surface uses dnd-kit keyboard attributes and an Enter/Space handler."
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:border-primary select-none ${
        canDrag
          ? "cursor-grab active:cursor-grabbing hover:border-info-outline"
          : "cursor-pointer"
      } ${isDragging ? "opacity-25 ring-2 ring-ring ring-offset-1" : ""}`}
    >
      {canDrag && (
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-muted-foreground" />
      )}
      <span className="shrink-0">{priorityIcon}</span>
      <span className="max-w-56 truncate text-xs font-semibold text-foreground">
        {task.title}
      </span>
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
        {task.parentTaskId ? "Subtask" : "Task"}
      </span>
    </div>
  );
}

function UnscheduledTasksPanel({
  unscheduledTasks,
  canReschedule,
  canEditTask,
  onTaskClick,
}: {
  unscheduledTasks: Task[];
  canReschedule: boolean;
  canEditTask?: (task: Task) => boolean;
  onTaskClick?: (task: Task) => void;
}) {
  if (unscheduledTasks.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-content ring-1 ring-warning-outline/20">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Unscheduled Tasks
            </h3>
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-content">
              {unscheduledTasks.length}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Drag unscheduled tasks directly onto any calendar date to schedule
            them. Done and Cancelled tasks cannot be dragged.
          </p>
        </div>
      </div>
      <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
        {unscheduledTasks.map((task) => (
          <DraggableUnscheduledTask
            key={task.id}
            task={task}
            canDrag={Boolean(
              canReschedule && (!canEditTask || canEditTask(task)),
            )}
            onClick={() => onTaskClick?.(task)}
          />
        ))}
      </div>
    </div>
  );
}

export interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateDate?: (date: string) => void;
  onTaskReschedule?: (taskId: string, targetDateKey: string) => void;
  canEditTask?: (task: Task) => boolean;
}

export default function CalendarView({
  tasks,
  onTaskClick,
  onCreateDate,
  onTaskReschedule,
  canEditTask,
}: CalendarViewProps) {
  const isDesktop = useMediaQuery(PROJECT_CALENDAR_DESKTOP_QUERY);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [yearInput, setYearInput] = useState("");
  const [isEditingYear, setIsEditingYear] = useState(false);
  const skipNextYearCommitRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const {
    currentMonth,
    setCurrentMonth,
    moveMonth,
    goToToday,
    days,
    unscheduledTasks,
    formatTime,
  } = useCalendarGrid({ tasks });
  const selectedMonth = currentMonth.getMonth();
  const selectedYear = currentMonth.getFullYear();
  const yearInputValue = isEditingYear ? yearInput : String(selectedYear);
  const monthOptions = useMemo(
    () =>
      MONTH_INDEXES.map((monthIndex) => ({
        value: String(monthIndex),
        label: new Date(2026, monthIndex, 1).toLocaleDateString(undefined, {
          month: "long",
        }),
      })),
    [],
  );
  const handleDragStart = (event: DragStartEvent) => {
    const currentTask = event.active.data.current?.task as Task | undefined;
    setActiveTask(currentTask ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !onTaskReschedule) return;

    const taskId = String(active.id);
    const targetKey = String(over.id);
    if (targetKey && targetKey !== "unscheduled") {
      onTaskReschedule(taskId, targetKey);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const handleMonthChange = (value: string) => {
    const nextMonth = Number(value);
    setCurrentMonth(
      (current) => new Date(current.getFullYear(), nextMonth, 1),
    );
  };

  const commitYearInput = () => {
    if (skipNextYearCommitRef.current) {
      skipNextYearCommitRef.current = false;
      setIsEditingYear(false);
      setYearInput("");
      return;
    }

    const nextYear = Number(yearInputValue);
    if (!Number.isInteger(nextYear) || nextYear < 1000 || nextYear > 9999) {
      setIsEditingYear(false);
      setYearInput("");
      return;
    }
    setIsEditingYear(false);
    setYearInput("");
    setCurrentMonth(
      (current) => new Date(nextYear, current.getMonth(), 1),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-card">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              Click any date or drag tasks to schedule.
            </p>
          </div>

          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveMonth(-1)}
              className="h-8 w-8 rounded-control text-muted-foreground hover:bg-muted cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Select
                value={String(selectedMonth)}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger
                  className="h-8 w-28 rounded-control border-input bg-card text-xs font-semibold text-foreground"
                  aria-label="Select calendar month"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border">
                  {monthOptions.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      className="text-xs font-semibold"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="text"
                inputMode="numeric"
                aria-label="Enter calendar year"
                value={yearInputValue}
                maxLength={4}
                onFocus={() => {
                  setIsEditingYear(true);
                  setYearInput(String(selectedYear));
                }}
                onChange={(event) => {
                  setIsEditingYear(true);
                  setYearInput(event.target.value.replace(/\D/g, ""));
                }}
                onBlur={commitYearInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    skipNextYearCommitRef.current = true;
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-16 rounded-control border-input bg-card text-center text-xs font-semibold text-foreground"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveMonth(1)}
              className="h-8 w-8 rounded-control text-muted-foreground hover:bg-muted cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2 rounded-control border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background cursor-pointer"
            >
              Today
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[560px]">
        <div className="sticky top-0 z-20 grid grid-cols-7 border-b border-border bg-background">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="border-r border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div key={`${selectedYear}-${selectedMonth}`}>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => {
            const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
            return (
              <ProjectCalendarWeek
                key={weekDays[0].key}
                days={weekDays}
                compact={!isDesktop}
                formatTime={formatTime}
                onTaskClick={onTaskClick}
                onCreateDate={onCreateDate}
              />
            );
          })}
        </div>

        <UnscheduledTasksPanel
          unscheduledTasks={unscheduledTasks}
          canReschedule={Boolean(onTaskReschedule)}
          canEditTask={canEditTask}
          onTaskClick={onTaskClick}
        />
        </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div
            className={`pointer-events-none flex items-center gap-2 rounded-lg border px-3 py-2 opacity-95 ${
              CALENDAR_TASK_STATUS_STYLES[activeTask.status] ?? "bg-primary-soft text-primary-soft-foreground"
            }`}
          >
            <GripVertical className="h-3.5 w-3.5 text-inherit" />
            <span className="max-w-64 truncate text-xs font-semibold text-inherit">
              {activeTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
