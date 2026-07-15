"use client";

import { type Task, TaskPriority } from "@/types/project";
import { LabelBadge } from "./status-badge";
import { AvatarStack } from "./avatar-stack";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Equal,
  Bug,
  Bookmark,
  CheckSquare2,
  FileText
} from "lucide-react";

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

export function getIssueKey(task: Task): string {
  const suffix = task.id.replace(/-/g, "").slice(0, 3).toUpperCase();
  return `TASK-${suffix}`;
}

export function getIssueTypeDetails(task: Task): { icon: React.ReactNode; label: string } {
  const titleLower = task.title.toLowerCase();
  const hasBugLabel = task.labels.some((l) => l.name.toLowerCase().includes("bug"));
  const hasDesignOrStoryLabel = task.labels.some(
    (l) => l.name.toLowerCase().includes("design") || l.name.toLowerCase().includes("story")
  );

  if (titleLower.includes("bug") || hasBugLabel) {
    return {
      icon: <Bug className="h-3.5 w-3.5 text-[#DE350B]" />,
      label: "Bug",
    };
  }
  if (titleLower.includes("thiết kế") || titleLower.includes("ui") || hasDesignOrStoryLabel) {
    return {
      icon: <Bookmark className="h-3.5 w-3.5 text-[#36B37E] fill-[#36B37E]" />,
      label: "Story",
    };
  }
  if (task.parentTaskId) {
    return {
      icon: <FileText className="h-3.5 w-3.5 text-[#6554C0]" />,
      label: "Subtask",
    };
  }
  return {
    icon: <CheckSquare2 className="h-3.5 w-3.5 text-[#0052CC] fill-[#DEEBFF]" />,
    label: "Task",
  };
}

export function getPriorityIcon(priority: TaskPriority): React.ReactNode {
  const withTitle = (icon: React.ReactNode, title: string) => (
    <span title={title} className="inline-flex">
      {icon}
    </span>
  );

  switch (priority) {
    case TaskPriority.URGENT:
      return withTitle(
        <ChevronsUp className="h-4 w-4 text-[#DE350B]" />,
        "Khẩn cấp",
      );
    case TaskPriority.HIGH:
      return withTitle(
        <ChevronUp className="h-4 w-4 text-[#FF8B00]" />,
        "Cao",
      );
    case TaskPriority.MEDIUM:
      return withTitle(
        <Equal className="h-4 w-4 text-[#42526E]" />,
        "Trung bình",
      );
    case TaskPriority.LOW:
    default:
      return withTitle(
        <ChevronDown className="h-4 w-4 text-[#0052CC]" />,
        "Thấp",
      );
  }
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
  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);
  const priorityIcon = getPriorityIcon(task.priority);

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
      className="group w-full rounded border border-slate-200 bg-white p-3 text-left shadow-[0_1px_1px_rgba(9,30,66,0.25)] hover:bg-[#F4F5F7] cursor-grab active:cursor-grabbing transition duration-150 focus-visible:outline-none"
    >
      {/* Title */}
      <p className="text-sm font-medium leading-normal text-[#172B4D] group-hover:text-[#0052CC] break-words">
        {task.title}
      </p>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelBadge key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}

      {/* Meta indicators */}
      {(task.dueDate || checklistTotal > 0 || task.comments.length > 0 || task.estimatedMinutes > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-slate-500">
          {/* Due date */}
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1 py-0.5 rounded ${
                overdue ? "bg-red-50 text-red-600" : "bg-slate-100"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Checklist */}
          {checklistTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1 py-0.5 rounded ${
                checklistDone === checklistTotal ? "bg-emerald-50 text-emerald-600" : "bg-slate-100"
              }`}
            >
              <CheckSquare className="h-3 w-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}

          {/* Comments */}
          {task.comments.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 px-1 py-0.5 rounded">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}

          {/* Estimate */}
          {task.estimatedMinutes > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 px-1 py-0.5 rounded">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h`
                : `${task.estimatedMinutes}m`}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Issue Key / Type & Priority / Assignees */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none">
          {issueType.icon}
          <span className="hover:underline font-semibold text-[11px] uppercase tracking-wide">
            {issueKey}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Icon */}
          <div className="grid place-items-center h-5 w-5 rounded hover:bg-slate-200 transition">
            {priorityIcon}
          </div>

          {/* Assignees stack */}
          {task.assignees.length > 0 && (
            <AvatarStack
              users={task.assignees.map((a) => ({
                userId: a.userId,
                displayName: a.displayName,
                avatarUrl: a.avatarUrl,
              }))}
              max={2}
              size="xs"
            />
          )}
        </div>
      </div>
    </button>
  );
}
