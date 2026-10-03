"use client";

import { FolderKanban } from "lucide-react";
import type { Project, Task } from "@/features/project/types/project";
import { ProjectTaskFocusButton } from "./task-focus-button";
import { PomodoroTaskEmptyState, PomodoroTaskFilterControls, type PomodoroTaskFilters } from "./pomodoro-task-filters";
import { isProjectFocusEligible } from "../utils/focus-task";

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
  const projects = [...new Map(tasks.map(({ project }) => [project.id, project])).values()];
  const query = filters.search.trim().toLocaleLowerCase();
  const matching = tasks.filter(({ task, project }) => isProjectFocusEligible(task, userId, filters.scope) &&
    (!projectId || project.id === projectId) && task.title.toLocaleLowerCase().includes(query));

  return (
    <div className="space-y-4">
      <div><h4 className="text-sm font-semibold text-slate-800">Assigned Project tasks</h4>
        <p className="mt-1 text-xs text-slate-500">Focus on work assigned to you in an active project.</p></div>
      <PomodoroTaskFilterControls sourceLabel="Project" filters={filters} onChange={onFiltersChange} />
      <select aria-label="Filter by project" value={projectId} onChange={(event) => onProjectChange(event.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
        <option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      {isLoading && <p role="status" className="text-xs text-slate-500">Loading Project tasks…</p>}
      {isError && <p role="alert" className="text-xs text-rose-600">Unable to load Project tasks. <button onClick={onRetry} className="underline">Retry</button></p>}
      {!isLoading && !isError && matching.length === 0 && <PomodoroTaskEmptyState sourceLabel="Project" filters={filters} onChange={onFiltersChange} />}
      {matching.length > 0 && <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
        {matching.map(({ task, project }) => <li key={task.id} className="flex items-center gap-2 py-3">
          <FolderKanban className="size-4 shrink-0" style={{ color: project.color }} />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{task.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{project.name} · {task.status === "TODO" ? "To do" : "In progress"} · {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : task.startDate ? new Date(task.startDate).toLocaleDateString() : "Unscheduled"}</p>
          </div>
          <ProjectTaskFocusButton task={task} project={project} />
        </li>)}
      </ul>}
    </div>
  );
}
