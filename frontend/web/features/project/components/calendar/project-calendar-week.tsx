"use client";

import type { CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarGridDay } from "../../hooks/use-calendar-grid";
import type { Task } from "../../types/project";
import { CALENDAR_TASK_STATUS_STYLES, PROJECT_CALENDAR_LAYOUT } from "../../constants/calendar-view.constants";
import { formatCalendarTaskRange, getCalendarWeekLayout } from "../../utils/calendar-layout.utils";
import CalendarDayTasks from "./calendar-day-tasks";

interface CalendarWeekProps {
  days: CalendarGridDay[];
  compact: boolean;
  formatTime: (value: string | undefined) => string;
  onTaskClick?: (task: Task) => void;
  onCreateDate?: (date: string) => void;
}

function DroppableCalendarDay({
  day, hiddenCount, compact, onTaskClick, onCreateDate,
}: Omit<CalendarWeekProps, "days" | "formatTime"> & { day: CalendarGridDay; hiddenCount: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key, disabled: !day.isCurrentMonth });
  return (
    <div
      ref={setNodeRef}
      className={`group relative min-w-0 border-r border-border transition-colors last:border-r-0 ${
        !day.isCurrentMonth ? "pointer-events-none bg-background" : isOver ? "bg-info-soft ring-2 ring-inset ring-ring" : "bg-card"
      }`}
    >
      <div className="flex h-[var(--calendar-day-header)] items-center justify-between px-1">
        {day.isCurrentMonth && <>
          <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${day.isToday ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground"}`}>
            {day.date.getDate()}
          </span>
          {onCreateDate && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Create task for ${day.key}`} onClick={() => onCreateDate(day.key)}
              className="size-7 rounded-control p-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
              <Plus className="size-3.5" />
            </Button>
          )}
        </>}
      </div>
      <div className="h-[var(--calendar-task-area)]" />
      <div className="flex h-[var(--calendar-day-footer)] items-center px-1">
        {day.isCurrentMonth && !isOver && (
          <CalendarDayTasks dateKey={day.key} tasks={day.tasks} hiddenCount={hiddenCount} compact={compact} onTaskClick={onTaskClick} onCreateDate={onCreateDate} />
        )}
      </div>
      {isOver && (
        <div className="pointer-events-none absolute inset-x-1 top-[var(--calendar-day-header)] bottom-[var(--calendar-day-footer)] z-10 flex items-center justify-center rounded-control border-2 border-dashed border-info-outline bg-info-soft/90">
          <span className="text-center text-xs font-semibold text-info-content">Drop task here</span>
        </div>
      )}
    </div>
  );
}

export default function ProjectCalendarWeek({ days, compact, formatTime, onTaskClick, onCreateDate }: CalendarWeekProps) {
  const layout = compact ? PROJECT_CALENDAR_LAYOUT.compact : PROJECT_CALENDAR_LAYOUT.desktop;
  const { visibleSegments, hiddenTaskCounts } = getCalendarWeekLayout(days, layout.visibleLanes);
  const weekStyle = {
    "--calendar-day-header": `${layout.headerHeight}px`,
    "--calendar-day-footer": `${layout.footerHeight}px`,
    "--calendar-task-row": `${layout.rowHeight}px`,
    "--calendar-task-area": `${layout.visibleLanes * layout.rowHeight + (layout.visibleLanes - 1) * PROJECT_CALENDAR_LAYOUT.rowGap}px`,
    "--calendar-task-gap": `${PROJECT_CALENDAR_LAYOUT.rowGap}px`,
  } as CSSProperties;

  return (
    <div style={weekStyle} className="relative isolate grid grid-cols-7 border-b border-border">
      {days.map((day, column) => (
        <DroppableCalendarDay key={day.key} day={day} hiddenCount={hiddenTaskCounts[column]} compact={compact} onTaskClick={onTaskClick} onCreateDate={onCreateDate} />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-[var(--calendar-day-header)] grid auto-rows-[var(--calendar-task-row)] grid-cols-7 gap-y-[var(--calendar-task-gap)]">
        {visibleSegments.map(({ task, startColumn, span, lane, showTitle }) => {
          const time = task.allDay ? "" : formatTime(task.startDate || task.dueDate);
          return (
            <Button key={task.id} type="button" variant="ghost" onClick={() => onTaskClick?.(task)}
              aria-label={`${task.title}. ${formatCalendarTaskRange(task)}`}
              title={`${task.title}\n${formatCalendarTaskRange(task)}`}
              style={{ gridColumn: `${startColumn + 1} / span ${span}`, gridRow: lane + 1 }}
              className={`pointer-events-auto mx-1 flex h-full min-w-0 justify-start gap-1 overflow-hidden rounded-control border px-2 py-0 text-left ${CALENDAR_TASK_STATUS_STYLES[task.status]}`}>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-inherit">{showTitle ? task.title : "Continued"}</span>
              {showTitle && time && !compact && span > 1 && (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-normal text-inherit">
                  <Clock className="size-3" />{time}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
