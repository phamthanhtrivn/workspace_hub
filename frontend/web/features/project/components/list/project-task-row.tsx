"use client";

import type { KeyboardEvent } from "react";
import { Calendar, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type Task,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { TASK_PRIORITY_LABELS } from "@/features/project/constants/task.constants";
import { TaskStatusBadge } from "../ui/status-badge";
import TaskLabelBadges from "../ui/task-label-badges";
import { Avatar } from "../ui/avatar-stack";
import { getIssueKey, getIssueIcon, getPriorityIcon } from "../ui/task-card";
import TaskChatButton from "../ui/task-chat-button";

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
  level?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  canCreateSubtask?: boolean;
  isCreatingSubtask?: boolean;
  onToggleExpanded?: () => void;
  onStartCreateSubtask?: () => void;
}

export default function ProjectTaskRow({
  task,
  reorderEnabled = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onTaskClick,
  onOpenChat,
  level = 0,
  hasChildren = false,
  isExpanded = false,
  canCreateSubtask = false,
  isCreatingSubtask = false,
  onToggleExpanded,
  onStartCreateSubtask,
}: ProjectTaskRowProps) {
  const overdue = isOverdue(task.dueDate, task.status);
  const issueKey = getIssueKey(task);
  const issueIcon = getIssueIcon();
  const priorityIcon = getPriorityIcon(task.priority);
  const isDraggable = reorderEnabled && !isTerminalTaskStatus(task.status);
  const showSubtaskAction = canCreateSubtask && level === 0;
  const showExpandAction = level === 0 && (hasChildren || showSubtaskAction);
  const subtaskActionVisibility =
    isExpanded || isCreatingSubtask
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100";

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
      onDragOver={(event) => {
        if (reorderEnabled) event.preventDefault();
      }}
      onDrop={(event) => {
        if (reorderEnabled) {
          event.preventDefault();
          onDrop?.(task.id);
        }
      }}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className="group relative grid min-w-[980px] grid-cols-[minmax(360px,1fr)_120px_110px_72px_72px_96px] items-center border-b border-slate-200 bg-white px-4 py-[7px] text-left transition-colors hover:z-20 hover:bg-slate-50 focus-within:z-20 focus-visible:bg-blue-50/50 focus-visible:outline-hidden cursor-pointer"
    >
      <div
        className="flex min-w-0 items-center gap-2"
        style={{ paddingLeft: level > 0 ? 32 : 0 }}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          {showExpandAction ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded?.();
              }}
              className="h-6 w-6 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#0052CC]"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <span className="h-6 w-6" />
          )}
        </div>
        <div className="shrink-0">{issueIcon}</div>
        <span className="w-[72px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-[#0052CC]">
          {issueKey}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`truncate text-sm font-medium group-hover:text-[#0052CC] ${
              level > 0 ? "text-slate-700" : "text-[#172B4D]"
            }`}
          >
            {task.title}
          </span>
          <TaskLabelBadges labels={task.labels} className="shrink-0" />
        </div>
      </div>

      <div className="text-right">
        <TaskStatusBadge status={task.status} compact />
      </div>

      <div className="text-right">
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
          <span className="text-xs text-slate-300">-</span>
        )}
      </div>

      <div
        className="flex justify-center"
        title={TASK_PRIORITY_LABELS[task.priority]}
      >
        {priorityIcon}
      </div>

      <div className="flex justify-center">
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

      <div className="flex items-center justify-end gap-1">
        {showSubtaskAction && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Create subtask"
            onClick={(event) => {
              event.stopPropagation();
              onStartCreateSubtask?.();
            }}
            className={`h-7 rounded-md px-2 text-[11px] font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-[#0052CC] focus-visible:opacity-100 ${subtaskActionVisibility}`}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Subtask
          </Button>
        )}
        <TaskChatButton task={task} onOpenChat={onOpenChat} compact />
      </div>
    </div>
  );
}
