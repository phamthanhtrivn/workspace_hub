"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Plus,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TaskStatus, type Task } from "@/features/project/types/project";
import { useCalendarGrid } from "@/features/project/hooks/use-calendar-grid";
import { taskDateKey } from "@/features/project/utils/task-dates";
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

const statusColors: Record<TaskStatus, { label: string; card: string }> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    card: "border-slate-600 bg-slate-500 hover:bg-slate-600 text-white",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    card: "border-[#0747A6] bg-[#0052CC] hover:bg-[#0747A6] text-white",
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    card: "border-amber-600 bg-amber-500 hover:bg-amber-600 text-white",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    card: "border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    card: "border-red-700 bg-red-600 hover:bg-red-700 text-white",
  },
};

interface CalendarTaskSegment {
  task: Task;
  startColumn: number;
  span: number;
  lane: number;
  showTitle: boolean;
}

export function buildWeekTaskSegments(
  weekDays: Array<{ key: string; isCurrentMonth?: boolean; tasks: Task[] }>,
): CalendarTaskSegment[] {
  if (weekDays.length === 0) return [];
  const currentMonthDays = weekDays.filter((d) => d.isCurrentMonth !== false);
  if (currentMonthDays.length === 0) return [];

  const weekStart = currentMonthDays[0].key;
  const weekEnd = currentMonthDays[currentMonthDays.length - 1].key;
  const uniqueTasks = new Map<string, Task>();
  currentMonthDays.forEach((day) =>
    day.tasks.forEach((task) => uniqueTasks.set(task.id, task)),
  );

  const candidates = [...uniqueTasks.values()]
    .map((task) => {
      const taskStart = taskDateKey(
        task.startDate || task.dueDate,
        task.allDay,
      );
      const taskEnd = taskDateKey(task.dueDate || task.startDate, task.allDay);
      const segmentStart = taskStart < weekStart ? weekStart : taskStart;
      const segmentEnd = taskEnd > weekEnd ? weekEnd : taskEnd;
      return {
        task,
        taskStart,
        startColumn: weekDays.findIndex((day) => day.key === segmentStart),
        endColumn: weekDays.findIndex((day) => day.key === segmentEnd),
      };
    })
    .filter(
      (segment) =>
        segment.startColumn >= 0 && segment.endColumn >= segment.startColumn,
    )
    .sort((a, b) => a.startColumn - b.startColumn || b.endColumn - a.endColumn);

  const occupiedThrough: number[] = [];
  return candidates.map((segment) => {
    let lane = occupiedThrough.findIndex(
      (endColumn) => endColumn < segment.startColumn,
    );
    if (lane < 0) lane = occupiedThrough.length;
    occupiedThrough[lane] = segment.endColumn;
    return {
      task: segment.task,
      startColumn: segment.startColumn,
      span: segment.endColumn - segment.startColumn + 1,
      lane,
      showTitle:
        segment.taskStart === weekDays[segment.startColumn].key ||
        segment.startColumn ===
          weekDays.findIndex((day) => day.isCurrentMonth !== false),
    };
  });
}

function getCalendarTaskTimeLabel(
  task: Task,
  formatTime: (value: string | undefined) => string,
): string {
  if (task.allDay) return "";
  const startTime = formatTime(task.startDate);
  const endTime = formatTime(task.dueDate);
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime;
}

function DroppableCalendarDay({
  date,
  keyStr,
  isCurrentMonth,
  isToday,
  dayTasksCount,
  onCreateDate,
  dropHereText,
  moreTasksText,
}: {
  date: Date;
  keyStr: string;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  dayTasksCount: number;
  onCreateDate?: (date: string) => void;
  dropHereText: string;
  moreTasksText: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: keyStr,
    disabled: !isCurrentMonth,
  });

  return (
    <div
      ref={setNodeRef}
      className={`group relative border-r border-slate-100 p-2 last:border-r-0 transition-colors ${
        !isCurrentMonth
          ? "bg-slate-50/40 pointer-events-none"
          : isOver
            ? "bg-blue-50/90 ring-2 ring-inset ring-blue-500 shadow-inner"
            : "bg-white"
      }`}
    >
      {isCurrentMonth && (
        <>
          <div className="flex items-center justify-between">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                isToday
                  ? "bg-[#0052CC] text-white"
                  : "text-slate-600"
              }`}
            >
              {date.getDate()}
            </span>
            {onCreateDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onCreateDate(keyStr)}
                className="pointer-events-auto h-7 w-7 rounded-lg text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 cursor-pointer p-0"
                aria-label={`Create task for ${keyStr}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {isOver && (
            <div className="pointer-events-none absolute inset-x-2 top-10 bottom-2 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/40">
              <span className="text-[11px] font-bold text-blue-700">
                {dropHereText}
              </span>
            </div>
          )}
          {dayTasksCount > 4 && !isOver && (
            <p className="absolute bottom-2 left-2 text-[10px] font-bold text-slate-400">
              {moreTasksText}
            </p>
          )}
        </>
      )}
    </div>
  );
}

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
      className={`group inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-[#0052CC] hover:shadow-md select-none ${
        canDrag
          ? "cursor-grab active:cursor-grabbing hover:border-blue-400"
          : "cursor-pointer"
      } ${isDragging ? "opacity-25 ring-2 ring-blue-400 ring-offset-1" : ""}`}
    >
      {canDrag && (
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
      )}
      <span className="shrink-0">{priorityIcon}</span>
      <span className="max-w-56 truncate text-xs font-bold text-[#172B4D]">
        {task.title}
      </span>
      <span className="shrink-0 text-[10px] font-semibold text-slate-400">
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
    <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-4 py-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-500/20">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172B4D]">
              Unscheduled Tasks
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {unscheduledTasks.length}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
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
      <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="relative shrink-0 flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-center">
          <div className="sm:absolute sm:left-4">
            <p className="text-xs font-semibold text-slate-400">
              Click any date or drag tasks to schedule.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveMonth(-1)}
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <Select
                value={String(selectedMonth)}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger
                  className="h-8 w-36 rounded-lg border-slate-200 bg-white text-xs font-bold text-[#172B4D] shadow-xs"
                  aria-label="Select calendar month"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200">
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
                className="h-8 w-24 rounded-lg border-slate-200 bg-white text-center text-xs font-bold text-[#172B4D] shadow-xs"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveMonth(1)}
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              Today
            </Button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-7 border-b border-slate-100 bg-slate-50/70">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="border-r border-slate-100 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {Array.from(
            { length: Math.ceil(days.length / 7) },
            (_, weekIndex) => {
              const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
              const segments = buildWeekTaskSegments(weekDays);
              const visibleSegments = segments.filter(
                (segment) => segment.lane < 4,
              );
              return (
                <div
                  key={weekDays[0].key}
                  className="relative grid min-h-40 grid-cols-7 border-b border-slate-100 sm:min-h-44"
                >
                  {weekDays.map(
                    ({
                      date,
                      key,
                      isCurrentMonth,
                      isToday,
                      tasks: dayTasks,
                    }) => (
                      <DroppableCalendarDay
                        key={key}
                        date={date}
                        keyStr={key}
                        isCurrentMonth={isCurrentMonth}
                        isToday={isToday}
                        dayTasksCount={dayTasks.length}
                        onCreateDate={onCreateDate}
                        dropHereText="Drop task here"
                        moreTasksText={`+${Math.max(0, dayTasks.length - 4)} more`}
                      />
                    ),
                  )}
                  <div className="pointer-events-none absolute inset-x-0 top-11 grid grid-cols-7 auto-rows-[42px] gap-y-1">
                    {visibleSegments.map(
                      ({ task, startColumn, span, lane, showTitle }) => {
                        const timeLabel = getCalendarTaskTimeLabel(
                          task,
                          formatTime,
                        );
                        return (
                        <Button
                          key={task.id}
                          type="button"
                          variant="ghost"
                          onClick={() => onTaskClick?.(task)}
                          style={{
                            gridColumn: `${startColumn + 1} / span ${span}`,
                            gridRow: lane + 1,
                          }}
                          className={`pointer-events-auto mx-1.5 flex h-auto min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left shadow-xs transition-all hover:brightness-95 hover:shadow-md cursor-pointer ${statusColors[task.status].card}`}
                        >
                          {showTitle && (
                            <span className="truncate text-[11px] font-bold text-white">
                              {task.title}
                            </span>
                          )}
                          {showTitle && timeLabel && (
                            <span className="ml-auto inline-flex min-w-0 shrink-0 items-center gap-0.5 truncate text-[9px] font-semibold text-white/90">
                              <Clock className="h-2.5 w-2.5 text-white/90" />
                              {timeLabel}
                            </span>
                          )}
                        </Button>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>

        <UnscheduledTasksPanel
          unscheduledTasks={unscheduledTasks}
          canReschedule={Boolean(onTaskReschedule)}
          canEditTask={canEditTask}
          onTaskClick={onTaskClick}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div
            className={`pointer-events-none flex items-center gap-2 rounded-lg border px-3 py-2 shadow-2xl opacity-95 ${
              statusColors[activeTask.status]?.card ?? "bg-slate-700 text-white"
            }`}
          >
            <GripVertical className="h-3.5 w-3.5 text-white/80" />
            <span className="max-w-64 truncate text-xs font-bold text-white">
              {activeTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
