"use client";

import { Button } from "@/components/ui/button";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";
import type {
  PomodoroReportStatusFilter,
  PomodoroReportTypeFilter,
} from "../utils/pomodoro-report";

interface PomodoroReportToolbarProps {
  sessionType: PomodoroReportTypeFilter;
  status: PomodoroReportStatusFilter;
  project: string;
  projects: [string, string][];
  activeFilterCount: number;
  onSessionTypeChange: (value: PomodoroReportTypeFilter) => void;
  onStatusChange: (value: PomodoroReportStatusFilter) => void;
  onProjectChange: (value: string) => void;
  onResetFilters: () => void;
}

export function PomodoroReportToolbar({
  sessionType,
  status,
  project,
  projects,
  activeFilterCount,
  onSessionTypeChange,
  onStatusChange,
  onProjectChange,
  onResetFilters,
}: PomodoroReportToolbarProps) {
  return (
    <CollapsibleContent keepMounted>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted-foreground">Type:</span>
            {(
              [
                { value: "all", label: "All" },
                { value: "FOCUS", label: "Focus" },
                { value: "BREAK", label: "Break" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={sessionType === opt.value ? "default" : "outline"}
                onClick={() => onSessionTypeChange(opt.value)}
                className={cn(
                  "h-7 rounded-control px-2.5 text-xs font-semibold",
                  sessionType !== opt.value && "bg-card text-muted-foreground",
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted-foreground">Status:</span>
            {(
              [
                { value: "all", label: "All" },
                { value: "COMPLETED", label: "Completed" },
                { value: "STOPPED", label: "Stopped" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={status === opt.value ? "default" : "outline"}
                onClick={() => onStatusChange(opt.value)}
                className={cn(
                  "h-7 rounded-control px-2.5 text-xs font-semibold",
                  status !== opt.value && "bg-card text-muted-foreground",
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted-foreground">
              Project:
            </span>
            <CustomSelect
              ariaLabel="Filter by project"
              value={project}
              onChange={onProjectChange}
              triggerClassName="h-7 rounded-control bg-card px-2.5 text-xs font-semibold"
              options={[
                { value: "", label: "All projects" },
                ...projects.map(([id, name]) => ({ value: id, label: name })),
              ]}
            />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onResetFilters}
            className="h-auto p-0 text-xs font-semibold text-destructive-content"
          >
            Reset filters
          </Button>
        )}
      </div>
    </CollapsibleContent>
  );
}
