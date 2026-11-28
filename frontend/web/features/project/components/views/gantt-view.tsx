"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import type { Task, TaskDependency } from "@/features/project/types/project";
import {
  useGanttTimeline,
} from "@/features/project/hooks/use-gantt-timeline";
import { getIssueKey, getPriorityIcon } from "../ui/task-card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { GANTT_HIT_WIDTH, GANTT_LAYER_CLASSES } from "../../constants/gantt.constants";
import { getGanttDatePosition, getGanttScrollLeft } from "../../utils/gantt-timeline.utils";
import GanttTaskRow, { type GanttColumnHighlight } from "../gantt/gantt-task-row";
import GanttToolbar from "../gantt/gantt-toolbar";

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
      <span className="min-w-0 max-w-56 truncate text-xs font-semibold text-foreground group-hover:text-info-content">
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
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const positionedRef = useRef(false);
  const [isUnscheduledExpanded, setIsUnscheduledExpanded] = useState(true);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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
    range,
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
    jumpToTask,
    anchorDate,
    hasToday,
  } = useGanttTimeline({
    tasks,
    dependencies,
    containerWidth,
  });

  const highlights = useMemo<GanttColumnHighlight[]>(() => {
    if (zoomMode === "month") return months.flatMap((month, index) => month.isCurrentMonth
      ? [{ left: index * monthWidth, width: monthWidth, className: "bg-info-soft/25" }] : []);
    if (zoomMode === "week") return weeks.flatMap((week, index) => week.isCurrentWeek
      ? [{ left: index * weekWidth, width: weekWidth, className: "bg-info-soft/25" }] : []);
    return days.flatMap((day, index) => day.isWeekend
      ? [{ left: index * dayWidth, width: dayWidth, className: "bg-background" }] : []);
  }, [zoomMode, months, weeks, days, monthWidth, weekWidth, dayWidth]);
  const gridWidth = zoomMode === "month" ? monthWidth : zoomMode === "week" ? weekWidth : dayWidth;

  useLayoutEffect(() => {
    const viewport = timelineScrollRef.current;
    if (!viewport || containerWidth === 0) return;
    const position = getGanttDatePosition(anchorDate, { range, zoomMode, dayWidth, monthWidth }, 0.5);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({
      left: getGanttScrollLeft(position, viewport.clientWidth, labelWidth, timelineWidth),
      behavior: positionedRef.current && !reducedMotion ? "smooth" : "auto",
    });
    positionedRef.current = true;
  }, [anchorDate, range, zoomMode, dayWidth, monthWidth, labelWidth, timelineWidth, containerWidth]);

  return (
    <TooltipProvider>
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
      <GanttToolbar
        rangeFormatted={rangeFormatted}
        currentMonthFormatted={currentMonthFormatted}
        taskCount={datedTasks.length}
        zoomMode={zoomMode}
        onZoomChange={setZoomMode}
        onNavigate={navigate}
        onToday={jumpToToday}
      />

      <div
        ref={containerRef}
        className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-panel border border-border bg-card"
      >
        <div
          ref={timelineScrollRef}
          className="relative isolate h-full w-full overflow-auto"
        >
          <div
            className="relative flex min-h-full min-w-max flex-col"
            style={{ width: `${labelWidth + timelineWidth}px` }}
          >
            <div
              className={`sticky top-0 ${GANTT_LAYER_CLASSES.header} grid shrink-0 border-b border-border bg-background`}
              style={{
                gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
              }}
            >
              <div className={`sticky left-0 ${GANTT_LAYER_CLASSES.corner} flex h-12 items-center justify-between border-r border-border bg-background px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground`}>
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
                          ? "bg-info-soft/80 font-semibold text-info-content"
                          : "text-foreground"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          month.isCurrentMonth
                            ? "text-info-content"
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
                          ? "bg-info-soft/80 font-semibold text-info-content"
                          : "text-foreground"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          week.isCurrentWeek
                            ? "text-info-content"
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
                          ? "bg-info-soft/70 font-semibold text-info-content"
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
                  className={`pointer-events-none absolute bottom-0 top-0 ${GANTT_LAYER_CLASSES.today} border-l-2 border-primary/75`}
                  style={{
                    left: `${labelWidth + todayLeft}px`,
                  }}
                />
              )}

              {datedTasks.length > 0 ? (
                datedTasks.map((item) => (
                  <GanttTaskRow
                    key={item.task.id}
                    item={item}
                    labelWidth={labelWidth}
                    timelineWidth={timelineWidth}
                    gridWidth={gridWidth}
                    highlights={highlights}
                    minimumHitWidth={coarsePointer ? GANTT_HIT_WIDTH.touch : GANTT_HIT_WIDTH.pointer}
                    getBarColor={getBarColor}
                    onTaskClick={onTaskClick}
                    onJumpToTask={jumpToTask}
                  />
                ))
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
            aria-expanded={isUnscheduledExpanded}
            className="flex h-auto w-full items-center justify-between gap-2 whitespace-normal rounded-none bg-background px-4 py-3 text-left transition hover:bg-muted font-normal cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-content ring-1 ring-warning-outline/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Unscheduled Tasks
                  </span>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-content">
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
    </TooltipProvider>
  );
}
