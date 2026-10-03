"use client";

import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePomodoroProjectTasks } from "../hooks/use-pomodoro-project-tasks";
import type { PomodoroActiveTask } from "../types/pomodoro";

interface PomodoroProjectTaskListProps {
  activeTask: PomodoroActiveTask | null;
  focusDurationMinutes: number;
  onSelect: (task: PomodoroActiveTask) => void;
}

export function PomodoroProjectTaskList({
  activeTask,
  focusDurationMinutes,
  onSelect,
}: PomodoroProjectTaskListProps) {
  const { data: tasks = [], isLoading, isError, refetch } = usePomodoroProjectTasks();

  return (
    <section className="mt-4 border-t border-slate-100 pt-3" aria-label="Your project tasks for today">
      <h5 className="text-xs font-semibold text-slate-700">Your project tasks for today</h5>
      {isLoading ? (
        <p role="status" className="mt-2 text-xs text-slate-400">Loading project tasks...</p>
      ) : isError ? (
        <div role="alert" className="mt-2 text-xs text-rose-600">
          Unable to load project tasks.
          <button type="button" onClick={() => void refetch()} className="ml-2 underline">Retry</button>
        </div>
      ) : tasks.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">No project tasks assigned to you for today.</p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {tasks.map(({ task, project }) => {
            const isActive = activeTask?.id === task.id && activeTask.projectId === project.id;
            return (
              <li key={task.id}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    if (isActive) return;
                    onSelect({
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      projectId: project.id,
                      projectName: project.name,
                      projectColor: project.color,
                      projectStatus: task.status,
                      priority: task.priority,
                      estimatedPomodoros: Math.max(1, Math.ceil(task.estimatedMinutes / focusDurationMinutes)),
                      completedPomodoros: 0,
                      checklists: task.checklists,
                    });
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border p-3 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isActive ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100",
                  )}
                >
                  <FolderKanban aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" style={{ color: project.color }} />
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-slate-700">{task.title}</span>
                    <span className="mt-1 block truncate text-[11px] text-slate-500">{project.name}</span>
                    {task.status === "IN_REVIEW" && <span className="mt-1 block text-[11px] text-amber-700">In review</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
