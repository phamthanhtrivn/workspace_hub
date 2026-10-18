"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import type { Task, TaskDependency } from "@/features/project/types/project";
import { GANTT_STATUS_LEGEND } from "@/features/project/constants/task.constants";
import {
  useGanttTimeline,
  type GanttZoomMode,
} from "@/features/project/hooks/use-gantt-timeline";
import { getIssueKey, getPriorityIcon } from "../ui/task-card";
import { Avatar } from "../ui/avatar-stack";
import { Button } from "@/components/ui/button";

function GanttUnscheduledTaskChip({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick?: (task: Task) => void;
}) {
  const issueKey = getIssueKey(task);
  const priorityIcon = getPriorityIcon(task.priority);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onTaskClick?.(task)}
      className="group inline-flex h-9 max-w-full justify-start gap-2 rounded-control border-border bg-card px-3 text-left transition hover:border-primary hover:bg-card cursor-pointer"
    >
      <span className="shrink-0">{priorityIcon}</span>
      <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
        {issueKey}
      </span>
      <span className="min-w-0 max-w-56 truncate text-xs font-semibold text-foreground group-hover:text-info">
        {task.title}
      </span>
      <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">
        {task.parentTaskId ? "Subtask" : "Task"}
      </span>
    </Button>
  );
}

export interface GanttViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  dependencies?: TaskDependency[];
}

export default function GanttView({
  tasks,
  onTaskClick,
  dependencies = [],
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

  const scrollToToday = useCallback(() => {
    if (timelineScrollRef.current && hasToday) {
      const container = timelineScrollRef.current;
      const targetScroll = labelWidth + todayLeft - container.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [hasToday, labelWidth, todayLeft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToToday, zoomMode]);

  const handleJumpToToday = () => {
    jumpToToday();
    setTimeout(() => {
      scrollToToday();
    }, 50);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-control text-muted-foreground transition hover:bg-card hover:text-foreground cursor-pointer p-0"
              title="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleJumpToToday}
              className="h-7 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-card hover:text-info cursor-pointer"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(1)}
              className="flex h-7 w-7 items-center justify-center rounded-control text-muted-foreground transition hover:bg-card hover:text-foreground cursor-pointer p-0"
              title="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {currentMonthFormatted}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              ({rangeFormatted})
            </span>
            <span className="inline-flex items-center rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info">
              {datedTasks.length} {datedTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          {(["day", "week", "month"] as GanttZoomMode[]).map((mode) => {
            const label =
              mode === "day" ? "Day" : mode === "week" ? "Week" : "Month";
            const isActive = zoomMode === mode;
            return (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoomMode(mode)}
                className={`h-7 rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-card text-info ring-1 ring-ring/80 hover:bg-card hover:text-info"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          {GANTT_STATUS_LEGEND.map((item) => (
            <span key={item.status} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-40 min-w-0 flex-1 shrink-0 overflow-hidden rounded-panel border border-border bg-card"
      >
        <div
          ref={timelineScrollRef}
          className="relative h-full w-full overflow-auto"
        >
          <div
            className="relative flex min-h-full w-full min-w-max flex-col"
            style={{ width: `${labelWidth + timelineWidth}px` }}
          >
            <div
              className="sticky top-0 z-20 grid shrink-0 border-b border-border bg-background"
              style={{
                gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
              }}
            >
              <div className="sticky left-0 z-20 flex h-12 items-center justify-between border-r border-border bg-background px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Task
                </span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {datedTasks.length}
                </span>
              </div>

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
                      className={`flex h-12 flex-col items-center justify-center border-r border-border text-center transition ${
                        month.isCurrentMonth
                          ? "bg-info-soft/80 font-semibold text-info"
                          : "text-foreground"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          month.isCurrentMonth
                            ? "text-info"
                            : "text-foreground"
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
                      className={`flex h-12 flex-col items-center justify-center border-r border-border text-center transition ${
                        week.isCurrentWeek
                          ? "bg-info-soft/80 font-semibold text-info"
                          : "text-foreground"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          week.isCurrentWeek
                            ? "text-info"
                            : "text-foreground"
                        }`}
                      >
                        {week.weekNumberFormatted}
                      </span>
                      <span className="mt-0.5 text-xs font-medium text-muted-foreground">
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
                      className={`flex h-12 flex-col items-center justify-center border-r border-border text-center transition ${
                        day.isToday
                          ? "bg-info-soft/70 font-semibold text-info"
                          : day.isWeekend
                            ? "bg-muted text-muted-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        {day.dayOfWeekFormatted}
                      </span>
                      <span
                        className={`mt-0.5 text-xs font-semibold ${
                          day.isToday
                            ? "flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary text-primary-foreground"
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

            <div className="relative min-h-[220px] flex-1 divide-y divide-border bg-card">
              {hasToday && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-[5] border-l-2 border-primary/75"
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
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onTaskClick?.(task);
                      }}
                      className={`group grid cursor-pointer text-left transition-colors duration-150 ${
                        isHovered ? "bg-info-soft/40" : "hover:bg-background"
                      }`}
                      style={{
                        gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
                      }}
                    >
                      <div
                        title={task.title}
                        className={`@container/gantt-label sticky left-0 z-10 flex h-12 min-w-0 items-center justify-between gap-2 border-r border-border px-2 transition-colors ${
                          isHovered
                            ? "bg-info-soft"
                            : "bg-card group-hover:bg-background"
                        } ${isSubtask ? "pl-8" : ""}`}
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0 @min-[240px]/gantt-label:flex-nowrap">
                          <span className="shrink-0">{priorityIcon}</span>
                          <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                            {issueKey}
                          </span>
                          <span className="min-w-0 basis-full truncate text-xs font-semibold text-foreground group-hover:text-info @min-[240px]/gantt-label:basis-auto">
                            {task.title}
                          </span>
                        </div>

                        <div className="hidden shrink-0 items-center gap-2 @min-[240px]/gantt-label:flex">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            {durationDays}{" "}
                            {durationDays === 1 ? "day" : "days"}
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

                      <div
                        className="relative block h-12 overflow-hidden"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, color-mix(in srgb, var(--muted) 80%, transparent) 1px, transparent 1px)",
                          backgroundSize: `${
                            zoomMode === "month"
                              ? monthWidth
                              : zoomMode === "week"
                                ? weekWidth
                                : dayWidth
                          }px 100%`,
                        }}
                      >
                        {zoomMode === "month"
                          ? months.map((month, idx) =>
                              month.isCurrentMonth ? (
                                <div
                                  key={month.isoKey}
                                  className="pointer-events-none absolute bottom-0 top-0 bg-info-soft/25"
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
                                    className="pointer-events-none absolute bottom-0 top-0 bg-info-soft/25"
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
                                    className="pointer-events-none absolute bottom-0 top-0 bg-background"
                                    style={{
                                      left: `${idx * dayWidth}px`,
                                      width: `${dayWidth}px`,
                                    }}
                                  />
                                ) : null,
                              )}

                        <div
                          className="absolute top-1/2 flex -translate-y-1/2 items-center"
                          style={{ left: `${left}px` }}
                        >
                          <div
                            className={`flex h-7 shrink-0 items-center rounded-md border px-2.5 text-xs font-semibold transition-all duration-150 ${
                              isHovered
                                ? "ring-2 ring-primary/40 ring-offset-1"
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

                          {width < 90 && (
                            <span
                              className="ml-2 whitespace-nowrap text-xs font-semibold text-foreground transition group-hover:text-info"
                              title={`${task.title} (${dateRangeFormatted})`}
                            >
                              {task.title}
                            </span>
                          )}
                        </div>

                        {predecessors.length > 0 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2"
                            style={{ left: `${Math.max(0, left - 18)}px` }}
                          >
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-info-soft text-xs font-semibold text-info ring-1 ring-ring"
                              title={`Predecessors: ${predecessors.map((p) => p.title).join(", ")}`}
                            >
                              {"<-"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No dated tasks to display in the Roadmap.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="shrink-0 overflow-hidden rounded-panel border border-border bg-card">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsUnscheduledExpanded((prev) => !prev)}
            className="flex h-auto w-full items-center justify-between gap-2 whitespace-normal rounded-none bg-background px-4 py-3 text-left transition hover:bg-muted font-normal cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning ring-1 ring-warning/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Unscheduled Tasks
                  </span>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                    {unscheduledTasks.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  Tasks without start or due dates are shown here.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              {isUnscheduledExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </Button>

          {isUnscheduledExpanded && (
            <div className="max-h-24 overflow-y-auto border-t border-border/80 p-4">
              <div className="flex flex-wrap gap-2">
                {unscheduledTasks.map((task) => (
                  <GanttUnscheduledTaskChip
                    key={task.id}
                    task={task}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
