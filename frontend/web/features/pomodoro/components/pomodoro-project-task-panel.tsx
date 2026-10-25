"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import type { Project, Task } from "@/features/project/types/project";
import { PomodoroProjectTaskItem } from "./pomodoro-project-task-item";
import { PomodoroTaskEmptyState, PomodoroTaskFilterControls, type PomodoroTaskFilters } from "./pomodoro-task-filters";
import { isProjectFocusEligible } from "../utils/focus-task";
import { LoadingState } from "@/components/ui/loading-state";

interface PomodoroProjectTaskPanelProps {
  tasks: { task: Task; project: Project }[];
  userId: string;
  filters: PomodoroTaskFilters;
  onFiltersChange: (filters: PomodoroTaskFilters) => void;
  projectId: string;
  onProjectChange: (projectId: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PomodoroProjectTaskPanel({ tasks, userId, filters, onFiltersChange, projectId, onProjectChange,
  isLoading, isError, onRetry }: PomodoroProjectTaskPanelProps) {
  const { busy, isReady } = usePomodoroSessionActions();
  const eligible = tasks.filter(({ task }) => isProjectFocusEligible(task, userId));
  const projects = [...new Map(eligible.map(({ project }) => [project.id, project])).values()];
  const selectedProjectId = projects.some((project) => project.id === projectId) ? projectId : "";
  useEffect(() => {
    if (!isLoading && !isError && projectId && !selectedProjectId) onProjectChange("");
  }, [isLoading, isError, projectId, selectedProjectId, onProjectChange]);
  const query = filters.search.trim().toLocaleLowerCase();
  const matching = tasks.filter(({ task, project }) => isProjectFocusEligible(task, userId, filters.scope) &&
    (!selectedProjectId || project.id === selectedProjectId) && task.title.toLocaleLowerCase().includes(query));

  return (
    <div className="space-y-4">
      <div><h4 className="text-sm font-semibold text-foreground">Assigned Project tasks</h4>
        <p className="mt-1 text-xs text-muted-foreground">Focus on work assigned to you in an active project.</p></div>
      <PomodoroTaskFilterControls sourceLabel="Project" filters={filters} onChange={onFiltersChange} />
      <CustomSelect ariaLabel="Filter by project" value={selectedProjectId} onChange={onProjectChange} disabled={busy || !isReady || isLoading}
        options={[{ value: "", label: "All projects" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
      {isLoading && <LoadingState label="Loading Project tasks…" className="text-xs text-muted-foreground" />}
      {isError && <p role="alert" className="text-xs text-destructive-content">Unable to load Project tasks. <Button type="button" variant="link" size="sm" onClick={onRetry}>Retry</Button></p>}
      {!isLoading && !isError && matching.length === 0 && <PomodoroTaskEmptyState sourceLabel="Project" filters={filters} onChange={onFiltersChange} />}
      {matching.length > 0 && <ul aria-label="Project tasks" className="max-h-72 space-y-2 overflow-y-auto p-1">
        {matching.map(({ task, project }) => <PomodoroProjectTaskItem key={task.id} task={task} project={project} />)}
      </ul>}
    </div>
  );
}
