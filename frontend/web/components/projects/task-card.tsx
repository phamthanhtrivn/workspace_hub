"use client";

import { type Task } from "@/types/project";
import { TaskPriorityBadge, LabelBadge } from "./status-badge";
import { AvatarStack } from "./avatar-stack";
import { Calendar, CheckSquare, MessageSquare, Clock, Paperclip } from "lucide-react";

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  });
}

export default function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick?: () => void;
}) {
  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const overdue = isOverdue(task.dueDate) && task.status !== "DONE";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="group w-full rounded-xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20"
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelBadge key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-bold leading-snug text-[var(--color-primary-dark)] group-hover:text-[var(--color-primary)]">
        {task.title}
      </p>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-semibold text-slate-400">
        {/* Priority */}
        <TaskPriorityBadge priority={task.priority} />

        {/* Due date */}
        {task.dueDate && (
          <span
            className={`inline-flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}
          >
            <Calendar className="h-3 w-3" strokeWidth={2} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Checklist */}
        {checklistTotal > 0 && (
          <span
            className={`inline-flex items-center gap-1 ${
              checklistDone === checklistTotal ? "text-emerald-500" : ""
            }`}
          >
            <CheckSquare className="h-3 w-3" strokeWidth={2} />
            {checklistDone}/{checklistTotal}
          </span>
        )}

        {/* Comments */}
        {task.comments.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" strokeWidth={2} />
            {task.comments.length}
          </span>
        )}

        {/* Estimated time */}
        {task.estimatedMinutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {task.estimatedMinutes >= 60
              ? `${Math.floor(task.estimatedMinutes / 60)}h`
              : `${task.estimatedMinutes}m`}
          </span>
        )}
      </div>

      {/* Bottom row: Assignees */}
      {task.assignees.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack
            users={task.assignees.map((a) => ({
              userId: a.userId,
              displayName: a.displayName,
              avatarUrl: a.avatarUrl,
            }))}
            max={3}
            size="xs"
          />
        </div>
      )}
    </button>
  );
}
