"use client";

import type { KeyboardEvent } from "react";
import { Calendar, Plus } from "lucide-react";
import { type Task, isTerminalTaskStatus } from "../types/project";
import { TaskStatusBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import { getIssueKey, getIssueTypeDetails, getPriorityIcon } from "./task-card";
import TaskChatButton from "./task-chat-button";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  });
}

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
  onAddSubtask,
}: ProjectTaskRowProps) {
  const overdue = isOverdue(task.dueDate, task.status);
  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);
  const priorityIcon = getPriorityIcon(task.priority);
  const isDraggable = reorderEnabled && !isTerminalTaskStatus(task.status);

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
      className="group flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-[7px] text-left transition-colors hover:bg-[#F4F5F7] cursor-pointer focus-visible:bg-[#DEEBFF] focus-visible:outline-none"
    >
      {/* Type icon */}
      <div className="shrink-0">{issueType.icon}</div>

      {/* Key */}
      <span className="shrink-0 min-w-[70px] text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-[#0052CC]">
        {issueKey}
      </span>

      {/* Title + labels */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-[#172B4D] group-hover:text-[#0052CC]">
          {task.title}
        </span>
        {task.labels.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {task.labels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} name={l.name} color={l.color} />
            ))}
          </div>
        )}
      </div>

      {/* Due date */}
      <div className="w-20 shrink-0 text-right">
        {task.dueDate ? (
          <span
            className={`inline-flex items-center gap-1 rounded px-1 text-[11px] font-semibold ${
              overdue
                ? "bg-red-50 text-[#DE350B]"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(task.dueDate)}
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
      <div className="flex w-8 shrink-0 justify-center">{priorityIcon}</div>

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

      {onAddSubtask && (
        <button
          type="button"
          title="Tạo subtask"
          onClick={(event) => {
            event.stopPropagation();
            onAddSubtask();
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-50 px-1.5 py-1 text-[11px] font-bold text-[#0052CC] transition hover:bg-[#DEEBFF]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Subtask</span>
        </button>
      )}
    </div>
  );
}
