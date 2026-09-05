"use client";

import { ListTree, Plus } from "lucide-react";
import type { Task } from "../types/project";
import { TaskStatusBadge } from "./status-badge";

interface TaskSubtasksSectionProps {
  task: Task;
  tasks: Task[];
  isReadOnly: boolean;
  onCreateSubtask?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
}

export default function TaskSubtasksSection({
  task,
  tasks,
  isReadOnly,
  onCreateSubtask,
  onTaskClick,
}: TaskSubtasksSectionProps) {
  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id,
  );
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : null;

  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <ListTree className="h-3.5 w-3.5" />
          <span>Subtasks</span>
        </h3>
        {onCreateSubtask && !task.parentTaskId && !isReadOnly && (
          <button
            type="button"
            onClick={() => onCreateSubtask(task)}
            className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100"
            title="Thêm subtask"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {parentTask && (
        <div className="mb-1.5 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
          <span className="text-[9px] font-bold uppercase text-slate-400">
            Cha:
          </span>
          <button
            type="button"
            onClick={() => onTaskClick?.(parentTask)}
            className="max-w-[200px] truncate text-right font-bold text-[#0052CC] hover:underline"
          >
            {parentTask.title}
          </button>
        </div>
      )}

      {childTasks.length > 0 ? (
        <div className="space-y-1">
          {childTasks.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onTaskClick?.(child)}
              className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="min-w-0 truncate pr-2 font-medium text-slate-700">
                {child.title}
              </span>
              <TaskStatusBadge status={child.status} compact />
            </button>
          ))}
        </div>
      ) : (
        !task.parentTaskId && (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50/30 py-4 text-center text-[11px] font-semibold text-slate-400">
            Không có subtask.
          </div>
        )
      )}
    </div>
  );
}
