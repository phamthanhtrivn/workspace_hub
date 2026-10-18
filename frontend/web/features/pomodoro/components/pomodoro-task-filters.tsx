"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FocusTaskScope } from "../utils/focus-task";

export interface PomodoroTaskFilters {
  scope: FocusTaskScope;
  search: string;
}

interface PomodoroTaskFiltersProps {
  sourceLabel: string;
  filters: PomodoroTaskFilters;
  onChange: (filters: PomodoroTaskFilters) => void;
}

export function PomodoroTaskFilterControls({ sourceLabel, filters, onChange }: PomodoroTaskFiltersProps) {
  return (
    <div className="space-y-3">
      <div role="group" className="flex flex-wrap gap-2" aria-label={`${sourceLabel} date scope`}>
        <Button size="sm" variant={filters.scope === "today" ? "default" : "outline"} aria-pressed={filters.scope === "today"}
          onClick={() => onChange({ ...filters, scope: "today" })}>Today</Button>
        <Button size="sm" variant={filters.scope === "all" ? "default" : "outline"} aria-pressed={filters.scope === "all"}
          onClick={() => onChange({ ...filters, scope: "all" })}>All eligible tasks</Button>
      </div>
      <Input aria-label={`Search ${sourceLabel} tasks`} value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder={`Search ${sourceLabel} tasks…`} />
      <p className="text-xs leading-relaxed text-muted-foreground">
        {filters.scope === "today" ? "Tasks scheduled for today" : "Today, upcoming or unscheduled"} · Completed and overdue tasks excluded
      </p>
      <Link className="inline-flex min-h-11 items-center text-xs text-link underline" href={sourceLabel.toLowerCase() === "calendar" ? "/calendar" : "/projects"}>Review overdue tasks in {sourceLabel}</Link>
    </div>
  );
}

export function PomodoroTaskEmptyState({ sourceLabel, filters, onChange }: PomodoroTaskFiltersProps) {
  return (
    <div className="rounded-panel bg-background px-4 py-6 text-center text-xs text-muted-foreground">
      <p>No matching {sourceLabel} tasks available for focus.</p>
      {filters.scope === "today" && <Button size="sm" variant="link" onClick={() => onChange({ ...filters, scope: "all" })}>
        Show upcoming & unscheduled tasks
      </Button>}
    </div>
  );
}
