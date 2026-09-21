"use client";

import type { KeyboardEvent } from "react";
import { Calendar } from "lucide-react";
import {
  type Task,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { TaskStatusBadge } from "../ui/status-badge";
import TaskLabelBadges from "../ui/task-label-badges";
import { Avatar } from "../ui/avatar-stack";
import { getIssueKey, getIssueIcon, getPriorityIcon } from "../ui/task-card";
import TaskChatButton from "../ui/task-chat-button";
import { TASK_PRIORITY_LABELS } from "@/features/project/constants/task.constants";

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

interface ProjectTaskRowProps {
  task: Task;
  reorderEnabled?: boolean;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (targetTaskId: string) => void;
  onTaskClick?: (task: Task) => void;
  onOpenChat?: (task: Task) => void;
  onAddSubtask?: () => void;
}

export default function ProjectTaskRow({
  task,
  reorderEnabled = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onTaskClick,
  onOpenChat,
}: ProjectTaskRowProps) {
  const overdue = isOverdue(task.dueDate, task.status);
  const issueKey = getIssueKey(task);
  const issueIcon = getIssueIcon();
  const priorityIcon = getPriorityIcon(task.priority);
  const isDraggable = reorderEnabled && !isTerminalTaskStatus(task.status);

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      })
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={() => {
        if (isDraggable) onDragStart?.(task.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (reorderEnabled) e.preventDefault();
      }}
      onDrop={(e) => {
        if (reorderEnabled) {
          e.preventDefault();
          onDrop?.(task.id);
        }
      }}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className="group relative flex items-center gap-3 overflow-visible border-b border-slate-200 bg-white px-4 py-[7px] text-left transition-colors hover:z-20 hover:bg-slate-50 focus-within:z-20 focus-visible:bg-blue-50/50 focus-visible:outline-hidden cursor-pointer"
    >
      <div className="shrink-0">{issueIcon}</div>

      {/* Key */}
      <span className="shrink-0 min-w-[70px] text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-[#0052CC]">
        {issueKey}
      </span>

      {/* Title + labels */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-[#172B4D] group-hover:text-[#0052CC]">
          {task.title}
        </span>
        <TaskLabelBadges labels={task.labels} className="shrink-0" />
      </div>

      {/* Due date */}
      <div className="w-20 shrink-0 text-right">
        {task.dueDate ? (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              overdue
                ? "bg-red-50 text-red-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {formattedDueDate}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Status */}
      <div className="w-28 shrink-0 text-right">
        <TaskStatusBadge status={task.status} compact />
      </div>

      {/* Priority */}
      <div
        className="flex w-8 shrink-0 justify-center"
        title={TASK_PRIORITY_LABELS[task.priority]}
      >
        {priorityIcon}
      </div>

      {/* Assignee */}
      <div className="flex w-8 shrink-0 justify-end">
        {task.assignees.length > 0 ? (
          <Avatar
            user={{
              userId: task.assignees[0].userId,
              displayName: task.assignees[0].displayName,
              avatarUrl: task.assignees[0].avatarUrl,
            }}
            size="xs"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-400">
            ?
          </span>
        )}
      </div>

      <TaskChatButton task={task} onOpenChat={onOpenChat} compact />
    </div>
  );
}
