"use client";

import { type Task } from "@/types/project";
import { TaskStatusBadge, TaskPriorityBadge, LabelBadge } from "./status-badge";
import { AvatarStack } from "./avatar-stack";
import { Calendar, Clock } from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "DONE") return false;
  return new Date(dueDate) < new Date();
}

export default function ListView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}) {
  const activeTasks = tasks.filter((t) => !t.archived);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_110px_100px_120px_100px_80px] gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due date</span>
        <span>Assignees</span>
        <span className="text-right">Time</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {activeTasks.map((task) => {
          const overdue = isOverdue(task.dueDate, task.status);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick?.(task)}
              className="group grid w-full grid-cols-[1fr_110px_100px_120px_100px_80px] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:bg-blue-50/40"
            >
              {/* Title + Labels */}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--color-primary-dark)] group-hover:text-[var(--color-primary)]">
                  {task.title}
                </p>
                {task.labels.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {task.labels.slice(0, 3).map((label) => (
                      <LabelBadge
                        key={label.id}
                        name={label.name}
                        color={label.color}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <TaskStatusBadge status={task.status} />
              </div>

              {/* Priority */}
              <div>
                <TaskPriorityBadge priority={task.priority} />
              </div>

              {/* Due date */}
              <div>
                {task.dueDate ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      overdue ? "text-red-500" : "text-slate-500"
                    }`}
                  >
                    <Calendar className="h-3 w-3" strokeWidth={2} />
                    {formatDate(task.dueDate)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>

              {/* Assignees */}
              <div>
                {task.assignees.length > 0 ? (
                  <AvatarStack
                    users={task.assignees.map((a) => ({
                      userId: a.userId,
                      displayName: a.displayName,
                      avatarUrl: a.avatarUrl,
                    }))}
                    max={3}
                    size="xs"
                  />
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>

              {/* Estimated time */}
              <div className="text-right">
                {task.estimatedMinutes > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock className="h-3 w-3" strokeWidth={2} />
                    {task.estimatedMinutes >= 60
                      ? `${Math.floor(task.estimatedMinutes / 60)}h`
                      : `${task.estimatedMinutes}m`}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeTasks.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-400">
          Chưa có task nào trong dự án.
        </div>
      )}
    </div>
  );
}
