"use client";

import { CheckCircle2, ListTree, Plus } from "lucide-react";
import { TaskStatus, type Task } from "@/features/project/types/project";
import { TaskStatusBadge } from "../ui/status-badge";
import { Button } from "@/components/ui/button";

interface TaskSubtasksSectionProps {
  task: Task;
  tasks: Task[];
  isReadOnly: boolean;
  onCreateSubtask?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onMarkParentDone?: () => Promise<void> | void;
}

export default function TaskSubtasksSection({
  task,
  tasks,
  isReadOnly,
  onCreateSubtask,
  onTaskClick,
  onMarkParentDone,
}: TaskSubtasksSectionProps) {
  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id,
  );
  const openChildTasks = childTasks.filter(
    (candidate) => !candidate.archived && candidate.status !== TaskStatus.DONE,
  );
  const canMarkParentDone =
    childTasks.length > 0 &&
    openChildTasks.length === 0 &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED &&
    !isReadOnly;
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <ListTree className="h-3.5 w-3.5" />
          <span>{task.parentTaskId ? "Parent Task" : "Subtasks"}</span>
        </h3>
        {onCreateSubtask && !task.parentTaskId && !isReadOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCreateSubtask(task)}
            className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Add Subtask"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {canMarkParentDone && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="font-semibold">All subtasks are done.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onMarkParentDone?.()}
            className="h-7 shrink-0 cursor-pointer gap-1.5 rounded-lg border-emerald-300 bg-white px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark parent done
          </Button>
        </div>
      )}

      {parentTask && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onTaskClick?.(parentTask)}
          className="mb-1.5 flex h-auto w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-slate-300 hover:bg-slate-100 font-normal"
        >
          <span className="min-w-0 truncate font-bold text-[#0052CC]">
            {parentTask.title}
          </span>
          <TaskStatusBadge status={parentTask.status} compact />
        </Button>
      )}

      {childTasks.length > 0 ? (
        <div className="space-y-1.5">
          {childTasks.map((child) => (
            <Button
              key={child.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onTaskClick?.(child)}
              className="flex h-auto w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-slate-300 hover:bg-slate-50 font-normal"
            >
              <span className="min-w-0 truncate pr-2 font-semibold text-slate-700">
                {child.title}
              </span>
              <TaskStatusBadge status={child.status} compact />
            </Button>
          ))}
        </div>
      ) : (
        !task.parentTaskId && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-4 text-center text-xs font-semibold text-slate-400">
            No subtasks created yet.
          </div>
        )
      )}
    </div>
  );
}
