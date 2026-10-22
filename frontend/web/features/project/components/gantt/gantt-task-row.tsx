"use client";

import type { ReactElement } from "react";
import { ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, TaskStatus } from "../../types/project";
import type { GanttTaskItem } from "../../hooks/use-gantt-timeline";
import { GANTT_BAR_LABEL_MIN_WIDTH, GANTT_LABEL_WIDTH, GANTT_LAYER_CLASSES } from "../../constants/gantt.constants";
import { TASK_STATUS_OPTIONS } from "../../constants/task.constants";
import { getGanttHitArea } from "../../utils/gantt-timeline.utils";
import { getIssueKey, getPriorityIcon } from "../ui/task-card";
import { Avatar } from "../ui/avatar-stack";

export interface GanttColumnHighlight {
  left: number;
  width: number;
  className: string;
}

interface GanttTaskRowProps {
  item: GanttTaskItem;
  labelWidth: number;
  timelineWidth: number;
  gridWidth: number;
  highlights: GanttColumnHighlight[];
  minimumHitWidth: number;
  getBarColor: (status: TaskStatus) => string;
  onTaskClick?: (task: Task) => void;
  onJumpToTask: (task: Task) => void;
}

function GanttTaskInfo({ item, children }: { item: GanttTaskItem; children: ReactElement }) {
  const status = TASK_STATUS_OPTIONS.find((option) => option.value === item.task.status)?.label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="break-words">{item.task.title}</p>
          <p className="font-normal">{status} · {item.durationDays} {item.durationDays === 1 ? "day" : "days"}</p>
          <p className="font-normal">{item.dateRangeFormatted}</p>
          {(item.clippedStart || item.clippedEnd) && <p className="font-normal">Continues outside this range</p>}
          {item.predecessors.length > 0 && <p className="font-normal">Predecessors: {item.predecessors.map((task) => task.title).join(", ")}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function GanttTaskRow({
  item, labelWidth, timelineWidth, gridWidth, highlights, minimumHitWidth, getBarColor, onTaskClick, onJumpToTask,
}: GanttTaskRowProps) {
  const { task, left, width, placement, durationDays } = item;
  const firstAssignee = task.assignees?.[0];
  const status = TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label;
  const accessibleName = `Open ${task.title}, ${status}, ${item.dateRangeFormatted}, ${durationDays} ${durationDays === 1 ? "day" : "days"}`;
  const hitArea = getGanttHitArea(left, width, timelineWidth, minimumHitWidth);

  return (
    <div className="group grid h-12 text-left hover:bg-background focus-within:bg-info-soft" style={{ gridTemplateColumns: `${labelWidth}px ${timelineWidth}px` }}>
      <div className={`sticky left-0 ${GANTT_LAYER_CLASSES.label} flex h-12 min-w-0 items-center gap-2 border-r border-border bg-card px-2 group-hover:bg-background group-focus-within:bg-info-soft`}>
        <GanttTaskInfo item={item}>
          <Button type="button" variant="unstyled" onClick={() => onTaskClick?.(task)} aria-label={accessibleName}
            className={`flex h-full min-w-0 flex-1 items-center gap-2 rounded-control text-left focus-visible:ring-inset ${item.isSubtask ? "pl-5" : ""}`}>
            <span aria-hidden="true" className="shrink-0">{getPriorityIcon(task.priority)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="truncate font-mono">{getIssueKey(task)}</span>
                {item.predecessors.length > 0 && <Link2 aria-hidden="true" className="size-3 shrink-0" />}
              </span>
              <span className="block truncate text-xs font-semibold text-foreground">{task.title}</span>
            </span>
          </Button>
        </GanttTaskInfo>
        {labelWidth >= GANTT_LABEL_WIDTH && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {durationDays} {durationDays === 1 ? "day" : "days"}
            </span>
            {firstAssignee && <Avatar user={{ userId: firstAssignee.userId, displayName: firstAssignee.displayName || "", avatarUrl: firstAssignee.avatarUrl }} size="xs" />}
          </div>
        )}
      </div>

      <div className={`relative ${GANTT_LAYER_CLASSES.timeline} flex h-12 min-w-0 items-center`} style={{
        backgroundImage: "linear-gradient(to right, color-mix(in srgb, var(--muted) 80%, transparent) 1px, transparent 1px)",
        backgroundSize: `${gridWidth}px 100%`,
      }}>
        {highlights.map((highlight) => (
          <div key={highlight.left} aria-hidden="true" className={`pointer-events-none absolute inset-y-0 ${highlight.className}`} style={{ left: highlight.left, width: highlight.width }} />
        ))}
        {placement !== "inside" ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToTask(task)}
            aria-label={`${placement === "before" ? "Before" : "After"} this range. Jump to ${task.title}, ${item.dateRangeFormatted}`}
            className="sticky ml-2 h-8 rounded-control bg-card px-2 text-xs font-medium text-muted-foreground"
            style={{ left: labelWidth + 8 }}>
            {placement === "before" ? <ChevronLeft aria-hidden="true" className="size-3.5" /> : <ChevronRight aria-hidden="true" className="size-3.5" />}
            {placement === "before" ? "Before this range" : "After this range"}
          </Button>
        ) : <>
          <div aria-hidden="true" className={`pointer-events-none absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md border text-xs font-semibold ${getBarColor(task.status)}`}
            style={{ left, width }}>
            {item.clippedStart && <ChevronLeft className="absolute left-0 size-3" />}
            {width >= GANTT_BAR_LABEL_MIN_WIDTH && <span className="block w-full truncate px-3">{task.title}</span>}
            {item.clippedEnd && <ChevronRight className="absolute right-0 size-3" />}
          </div>
          <GanttTaskInfo item={item}>
            <Button type="button" variant="unstyled" onClick={() => onTaskClick?.(task)} aria-label={accessibleName}
              className="absolute top-1/2 h-11 -translate-y-1/2 rounded-control focus-visible:ring-inset"
              style={{ left: hitArea.left, width: hitArea.width }} />
          </GanttTaskInfo>
        </>}
      </div>
    </div>
  );
}
