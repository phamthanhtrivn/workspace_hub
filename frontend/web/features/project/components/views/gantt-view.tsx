"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight,
  Layers,
  Calendar,
  GripVertical,
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
import type { Task, TaskDependency } from "@/features/project/types/project";
import { GANTT_STATUS_LEGEND } from "@/features/project/constants/task.constants";
import {
  useGanttTimeline,
  dateKey,
  type GanttZoomMode,
} from "@/features/project/hooks/use-gantt-timeline";
import { getIssueKey, getPriorityIcon } from "../ui/task-card";
import { Avatar } from "../ui/avatar-stack";

import { Button } from "@/components/ui/button";

function DroppableGanttColumn({
  id,
  label,
  subLabel,
  dropText,
}: {
  id: string;
  label: string;
  subLabel?: string;
  dropText: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-full select-none flex-col items-center justify-start border-r transition-colors duration-150 ${
        isOver
          ? "border-blue-500 bg-blue-500/20 ring-2 ring-inset ring-blue-500 z-30"
          : "border-slate-200/50 hover:bg-blue-50/15"
      }`}
    >
      {isOver && (
        <div className="sticky top-14 z-30 mx-auto mt-2 flex max-w-[95%] flex-col items-center justify-center rounded-lg bg-[#0052CC] px-2.5 py-1.5 text-center text-white shadow-xl animate-in fade-in zoom-in-95 pointer-events-none">
          <span className="text-xs font-bold leading-tight whitespace-nowrap">
            {label}
          </span>
          {subLabel && (
            <span className="text-[10px] font-medium text-blue-100 whitespace-nowrap">
              {subLabel}
            </span>
          )}
          <span className="mt-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase text-white whitespace-nowrap">
            {dropText}
          </span>
        </div>
      )}
    </div>
  );
}

function DraggableGanttUnscheduledCard({
  task,
  canDrag,
  onTaskClick,
}: {
  task: Task;
  canDrag: boolean;
  onTaskClick?: (task: Task) => void;
}) {
  const issueKey = getIssueKey(task);
  const priorityIcon = getPriorityIcon(task.priority);
  const firstAssignee = task.assignees?.[0];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
    data: { task, issueKey },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className={`group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition select-none ${
        canDrag
          ? "cursor-grab active:cursor-grabbing hover:border-[#0052CC] hover:shadow-md"
          : "cursor-pointer hover:border-slate-300"
      } ${
        isDragging
          ? "opacity-30 border-dashed border-[#0052CC] ring-2 ring-[#0052CC]/30"
          : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            {canDrag && (
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
            )}
            <span className="font-mono text-[10px] font-bold text-slate-400">
              {issueKey}
            </span>
          </div>
          <span className="shrink-0">{priorityIcon}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-bold text-[#172B4D] group-hover:text-[#0052CC]">
          {task.title}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        {firstAssignee ? (
          <Avatar
            user={{
              userId: firstAssignee.id,
              displayName: firstAssignee.displayName || "",
              avatarUrl: firstAssignee.avatarUrl,
            }}
            size="xs"
          />
        ) : (
          <span className="text-[10px] text-slate-400">—</span>
        )}

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0052CC] group-hover:underline">
          <span>Schedule</span>
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

export interface GanttViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  dependencies?: TaskDependency[];
  onTaskReschedule?: (taskId: string, targetDateKey: string) => void;
  canEditTask?: (task: Task) => boolean;
}

export default function GanttView({
  tasks,
  onTaskClick,
  dependencies = [],
  onTaskReschedule,
  canEditTask,
}: GanttViewProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [isUnscheduledExpanded, setIsUnscheduledExpanded] = useState(true);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(Math.floor(el.clientWidth));

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const {
    rangeFormatted,
    currentMonthFormatted,
    days,
    weeks,
    months,
    datedTasks,
    unscheduledTasks,
    timelineWidth,
    todayLeft,
    dayWidth,
    weekWidth,
    monthWidth,
    labelWidth,
    getBarColor,
    zoomMode,
    setZoomMode,
    navigate,
    jumpToToday,
    hasToday,
  } = useGanttTimeline({
    tasks,
    dependencies,
    containerWidth,
  });

  // Auto-scroll timeline to center on Today
  const scrollToToday = () => {
    if (timelineScrollRef.current && hasToday) {
      const container = timelineScrollRef.current;
      const targetScroll = labelWidth + todayLeft - container.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode]);

  const handleJumpToToday = () => {
    jumpToToday();
    setTimeout(() => {
      scrollToToday();
    }, 50);
  };

  const [activeTask, setActiveTask] = useState<{
    task: Task;
    issueKey: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const currentTask = event.active.data.current?.task as Task | undefined;
    const issueKey = event.active.data.current?.issueKey as string | undefined;
    if (currentTask) {
      setActiveTask({
        task: currentTask,
        issueKey: issueKey || getIssueKey(currentTask),
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !onTaskReschedule) return;

    const taskId = String(active.id);
    const targetDateKey = String(over.id);
    if (targetDateKey && targetDateKey !== "unscheduled") {
      onTaskReschedule(taskId, targetDateKey);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col space-y-4">
        {/* ─── Gantt Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
          {/* Left: Navigation & Period */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-xs">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs cursor-pointer p-0"
                title="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleJumpToToday}
                className="h-7 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-white hover:text-[#0052CC] hover:shadow-xs cursor-pointer"
              >
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-xs cursor-pointer p-0"
                title="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-[#172B4D]">
                {currentMonthFormatted}
              </span>
              <span className="text-xs font-medium text-slate-400">
                ({rangeFormatted})
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0052CC]">
                {datedTasks.length} {datedTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>

          {/* Center: 3 Zoom Buttons (Day / Week / Month) */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-xs">
            {(["day", "week", "month"] as GanttZoomMode[]).map((mode) => {
              const label =
                mode === "day"
                  ? "Day"
                  : mode === "week"
                    ? "Week"
                    : "Month";
              const isActive = zoomMode === mode;
              return (
                <Button
                  key={mode}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomMode(mode)}
                  className={`h-7 rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-white text-[#0052CC] shadow-xs ring-1 ring-slate-200/80 hover:bg-white hover:text-[#0052CC]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          {/* Right: Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            {GANTT_STATUS_LEGEND.map((item) => (
              <span
                key={item.status}
                className="inline-flex items-center gap-1.5"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ─── Timeline Grid Canvas ─────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
        >
          <div
            ref={timelineScrollRef}
            className="relative w-full overflow-x-auto overflow-y-hidden"
          >
            <div
              className="relative w-full min-w-max"
              style={{ width: `${labelWidth + timelineWidth}px` }}
            >
              {/* ─── Unified Single-Tier Header ───────────────────────────────── */}
              <div
                className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-50"
                style={{
                  gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
                }}
              >
                {/* Left Column Header (Solid Opaque, No Transparency) */}
                <div className="sticky left-0 z-20 flex h-12 items-center justify-between border-r border-slate-200 bg-slate-50 px-4 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-slate-400" />
                    Task
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {datedTasks.length}
                  </span>
                </div>

                {/* Right: Columns */}
                {zoomMode === "month" ? (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${months.length}, ${monthWidth}px)`,
                    }}
                  >
                    {months.map((month) => (
                      <div
                        key={month.isoKey}
                        className={`flex h-12 flex-col items-center justify-center border-r border-slate-200 text-center transition ${
                          month.isCurrentMonth
                            ? "bg-blue-50/80 font-bold text-[#0052CC]"
                            : "text-slate-700"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold leading-tight ${
                            month.isCurrentMonth
                              ? "text-[#0052CC]"
                              : "text-[#172B4D]"
                          }`}
                        >
                          {month.monthFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : zoomMode === "week" ? (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${weeks.length}, ${weekWidth}px)`,
                    }}
                  >
                    {weeks.map((week) => (
                      <div
                        key={week.isoKey}
                        className={`flex h-12 flex-col items-center justify-center border-r border-slate-200 text-center transition ${
                          week.isCurrentWeek
                            ? "bg-blue-50/80 font-bold text-[#0052CC]"
                            : "text-slate-700"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold leading-tight ${
                            week.isCurrentWeek
                              ? "text-[#0052CC]"
                              : "text-[#172B4D]"
                          }`}
                        >
                          {week.weekNumberFormatted}
                        </span>
                        <span className="mt-0.5 text-[10px] font-medium text-slate-500">
                          {week.dateRangeFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)`,
                    }}
                  >
                    {days.map((day) => (
                      <div
                        key={day.isoKey}
                        className={`flex h-12 flex-col items-center justify-center border-r border-slate-200/70 text-center transition ${
                          day.isToday
                            ? "bg-blue-50/70 font-bold text-[#0052CC]"
                            : day.isWeekend
                              ? "bg-slate-100/60 text-slate-400"
                              : "text-slate-600"
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          {day.dayOfWeekFormatted}
                        </span>
                        <span
                          className={`mt-0.5 text-xs font-bold ${
                            day.isToday
                              ? "flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#0052CC] text-white shadow-xs"
                              : ""
                          }`}
                        >
                          {day.dayNumberFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Task Rows & Timeline Body ───────────────────────────────── */}
              <div className="relative min-h-[220px] divide-y divide-slate-100 bg-white">
                {/* Full-height vertical "Today" indicator line */}
                {hasToday && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-[5] border-l-2 border-[#0052CC]/75"
                    style={{
                      left: `${labelWidth + todayLeft}px`,
                    }}
                  />
                )}

                {datedTasks.length > 0 ? (
                  datedTasks.map((item) => {
                    const {
                      task,
                      left,
                      width,
                      durationDays,
                      isSubtask,
                      predecessors,
                      dateRangeFormatted,
                    } = item;

                    const isHovered = hoveredTaskId === task.id;
                    const issueKey = getIssueKey(task);
                    const priorityIcon = getPriorityIcon(task.priority);
                    const firstAssignee = task.assignees?.[0];

                    return (
                      <div
                        key={task.id}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onClick={() => onTaskClick?.(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onTaskClick?.(task);
                        }}
                        className={`group grid cursor-pointer text-left transition-colors duration-150 ${
                          isHovered ? "bg-blue-50/40" : "hover:bg-slate-50/70"
                        }`}
                        style={{
                          gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
                        }}
                      >
                        {/* Left Task Column */}
                        <div
                          className={`sticky left-0 z-10 flex h-12 min-w-0 items-center justify-between gap-2 border-r border-slate-200 px-4 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] transition-colors ${
                            isHovered
                              ? "bg-blue-50"
                              : "bg-white group-hover:bg-slate-50"
                          } ${isSubtask ? "pl-8" : ""}`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="shrink-0">{priorityIcon}</span>
                            <span className="shrink-0 font-mono text-[10px] font-bold text-slate-400">
                              {issueKey}
                            </span>
                            <span className="min-w-0 truncate text-xs font-bold text-[#172B4D] group-hover:text-[#0052CC]">
                              {task.title}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                              {durationDays} {durationDays === 1 ? "day" : "days"}
                            </span>
                            {firstAssignee && (
                              <Avatar
                                user={{
                                   userId: firstAssignee.userId,
                                  displayName: firstAssignee.displayName || "",
                                  avatarUrl: firstAssignee.avatarUrl,
                                }}
                                size="xs"
                              />
                            )}
                          </div>
                        </div>

                        {/* Right Timeline Grid Cell */}
                        <div
                          className="relative block h-12 overflow-hidden"
                          style={{
                            backgroundImage:
                              "linear-gradient(to right, rgb(241 245 249 / 0.8) 1px, transparent 1px)",
                            backgroundSize: `${
                              zoomMode === "month"
                                ? monthWidth
                                : zoomMode === "week"
                                  ? weekWidth
                                  : dayWidth
                            }px 100%`,
                          }}
                        >
                          {/* Column highlights */}
                          {zoomMode === "month"
                            ? months.map((month, idx) =>
                                month.isCurrentMonth ? (
                                  <div
                                    key={month.isoKey}
                                    className="pointer-events-none absolute bottom-0 top-0 bg-blue-50/25"
                                    style={{
                                      left: `${idx * monthWidth}px`,
                                      width: `${monthWidth}px`,
                                    }}
                                  />
                                ) : null,
                              )
                            : zoomMode === "week"
                              ? weeks.map((week, idx) =>
                                  week.isCurrentWeek ? (
                                    <div
                                      key={week.isoKey}
                                      className="pointer-events-none absolute bottom-0 top-0 bg-blue-50/25"
                                      style={{
                                        left: `${idx * weekWidth}px`,
                                        width: `${weekWidth}px`,
                                      }}
                                    />
                                  ) : null,
                                )
                              : days.map((day, idx) =>
                                  day.isWeekend ? (
                                    <div
                                      key={day.isoKey}
                                      className="pointer-events-none absolute bottom-0 top-0 bg-slate-50/40"
                                      style={{
                                        left: `${idx * dayWidth}px`,
                                        width: `${dayWidth}px`,
                                      }}
                                    />
                                  ) : null,
                                )}

                          {/* Gantt Bar & Label */}
                          <div
                            className="absolute top-1/2 flex -translate-y-1/2 items-center"
                            style={{ left: `${left}px` }}
                          >
                            {/* Colored Bar Pill */}
                            <div
                              className={`flex h-7 shrink-0 items-center rounded-md border px-2.5 text-[11px] font-bold shadow-xs transition-all duration-150 ${
                                isHovered
                                  ? "ring-2 ring-[#0052CC]/40 ring-offset-1"
                                  : ""
                              } ${getBarColor(task.status)}`}
                              style={{ width: `${width}px` }}
                              title={`${task.title} (${dateRangeFormatted})`}
                            >
                              {width >= 90 && (
                                <span className="min-w-0 truncate font-semibold">
                                  {task.title}
                                </span>
                              )}
                            </div>

                            {/* Outside title if bar is short */}
                            {width < 90 && (
                              <span
                                className="ml-2 whitespace-nowrap text-xs font-bold text-slate-800 transition group-hover:text-[#0052CC]"
                                title={`${task.title} (${dateRangeFormatted})`}
                              >
                                {task.title}
                              </span>
                            )}
                          </div>

                          {/* Dependency links / predecessor badges */}
                          {predecessors.length > 0 && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2"
                              style={{ left: `${Math.max(0, left - 18)}px` }}
                            >
                              <span
                                className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-700 ring-1 ring-indigo-200"
                                title={`Predecessors: ${predecessors.map((p) => p.title).join(", ")}`}
                              >
                                ←
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No dated tasks to display in the timeline.
                    </p>
                  </div>
                )}
              </div>

              {/* ─── Droppable Overlay when dragging unscheduled task ───────── */}
              {activeTask && (
                <div
                  className="pointer-events-auto absolute inset-y-0 z-20 grid"
                  style={{
                    left: `${labelWidth}px`,
                    width: `${timelineWidth}px`,
                    gridTemplateColumns:
                      zoomMode === "month"
                        ? `repeat(${months.length}, ${monthWidth}px)`
                        : zoomMode === "week"
                          ? `repeat(${weeks.length}, ${weekWidth}px)`
                          : `repeat(${days.length}, ${dayWidth}px)`,
                  }}
                >
                  {zoomMode === "month"
                    ? months.map((month) => (
                        <DroppableGanttColumn
                          key={month.isoKey}
                          id={dateKey(month.startDate)}
                          label={month.monthFormatted}
                          subLabel={String(month.year)}
                          dropText="Drop to schedule"
                        />
                      ))
                    : zoomMode === "week"
                      ? weeks.map((week) => (
                          <DroppableGanttColumn
                            key={week.isoKey}
                            id={dateKey(week.startDate)}
                            label={week.weekNumberFormatted}
                            subLabel={week.dateRangeFormatted}
                            dropText="Drop to schedule"
                          />
                        ))
                      : days.map((day) => (
                          <DroppableGanttColumn
                            key={day.isoKey}
                            id={dateKey(day.date)}
                            label={`${day.dayOfWeekFormatted} ${day.dayNumberFormatted}`}
                            subLabel={day.monthFormatted}
                            dropText="Drop to schedule"
                          />
                        ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Unscheduled Tasks Section (Collapsible Drawer) ────────────────── */}
        {unscheduledTasks.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            {/* Drawer Header */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsUnscheduledExpanded((prev) => !prev)}
              className="flex h-auto w-full items-center justify-between rounded-none bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100/70 font-normal cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-500/20">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172B4D]">
                      Unscheduled Tasks
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {unscheduledTasks.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Drag any unscheduled task onto a timeline date to schedule it.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                {isUnscheduledExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </Button>

            {/* Drawer Body */}
            {isUnscheduledExpanded && (
              <div className="border-t border-slate-200/80 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {unscheduledTasks.map((task) => (
                    <DraggableGanttUnscheduledCard
                      key={task.id}
                      task={task}
                      canDrag={Boolean(
                        onTaskReschedule && (!canEditTask || canEditTask(task)),
                      )}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-64 cursor-grabbing rounded-lg border-2 border-[#0052CC] bg-white p-3 shadow-2xl ring-4 ring-[#0052CC]/20 opacity-95 rotate-1 pointer-events-none select-none">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#0052CC]" />
                <span className="font-mono text-[10px] font-bold text-[#0052CC]">
                  {activeTask.issueKey}
                </span>
              </div>
              <span className="shrink-0">
                {getPriorityIcon(activeTask.task.priority)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-[#172B4D]">
              {activeTask.task.title}
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span className="text-[10px] font-semibold text-[#0052CC]">
                Drop to schedule
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
