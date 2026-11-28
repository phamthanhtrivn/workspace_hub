"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GanttZoomMode } from "../../types/gantt";
import { GANTT_STATUS_LEGEND } from "../../constants/task.constants";

interface GanttToolbarProps {
  rangeFormatted: string;
  currentMonthFormatted: string;
  taskCount: number;
  zoomMode: GanttZoomMode;
  onZoomChange: (mode: GanttZoomMode) => void;
  onNavigate: (direction: -1 | 1) => void;
  onToday: () => void;
}

export default function GanttToolbar({ rangeFormatted, currentMonthFormatted, taskCount, zoomMode, onZoomChange, onNavigate, onToday }: GanttToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-control border border-border bg-background p-0.5">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onNavigate(-1)} aria-label="Previous period" className="h-8 w-8 rounded-control p-0 text-muted-foreground">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onToday} className="h-8 px-2.5 text-xs font-semibold">Today</Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onNavigate(1)} aria-label="Next period" className="h-8 w-8 rounded-control p-0 text-muted-foreground">
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{currentMonthFormatted}</span>
          <span className="text-xs font-medium text-muted-foreground">({rangeFormatted})</span>
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-content">{taskCount} {taskCount === 1 ? "task" : "tasks"}</span>
        </div>
      </div>
      <div role="group" aria-label="Gantt timescale" className="inline-flex items-center rounded-control border border-border bg-muted p-0.5">
        {(["day", "week", "month"] as const).map((mode) => (
          <Button key={mode} type="button" variant="ghost" size="sm" aria-pressed={mode === zoomMode} onClick={() => onZoomChange(mode)}
            className={`h-8 rounded-md px-3 text-xs font-semibold ${mode === zoomMode ? "bg-card text-info-content ring-1 ring-ring/80 hover:bg-card" : "text-muted-foreground"}`}>
            {mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground" aria-label="Task status legend">
        {GANTT_STATUS_LEGEND.map((item) => (
          <span key={item.status} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${item.color}`} />{item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
