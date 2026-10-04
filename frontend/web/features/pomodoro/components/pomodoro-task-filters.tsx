"use client";

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
      <div className="flex flex-wrap gap-2" aria-label={`${sourceLabel} date scope`}>
        <Button size="sm" variant={filters.scope === "today" ? "default" : "outline"} aria-pressed={filters.scope === "today"}
          onClick={() => onChange({ ...filters, scope: "today" })}>Today</Button>
        <Button size="sm" variant={filters.scope === "all" ? "default" : "outline"} aria-pressed={filters.scope === "all"}
          onClick={() => onChange({ ...filters, scope: "all" })}>All eligible tasks</Button>
      </div>
      <Input aria-label={`Search ${sourceLabel} tasks`} value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder={`Search ${sourceLabel} tasks…`} />
      <p className="text-[11px] leading-relaxed text-slate-500">
        {filters.scope === "today" ? "Tasks scheduled for today" : "Today, upcoming or unscheduled"} · Completed and overdue tasks excluded
      </p>
    </div>
  );
}

export function PomodoroTaskEmptyState({ sourceLabel, filters, onChange }: PomodoroTaskFiltersProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
      <p>No matching {sourceLabel} tasks available for focus.</p>
      {filters.scope === "today" && <Button size="sm" variant="link" onClick={() => onChange({ ...filters, scope: "all" })}>
        Show upcoming & unscheduled tasks
      </Button>}
    </div>
  );
}
