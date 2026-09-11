"use client";

import {
  type Task,
  TaskPriority,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { LabelBadge } from "./status-badge";
import { AvatarStack } from "./avatar-stack";
import TaskChatButton from "./task-chat-button";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Equal,
  CheckSquare2,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  TASK_PRIORITY_LABEL_IDS,
  TASK_TYPE_LABEL_IDS,
} from "@/features/project/constants/task.constants";

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getIssueKey(task: Task): string {
  return `TASK-${task.taskNumber}`;
}

export function getIssueTypeDetails(task: Task): {
  icon: React.ReactNode;
  labelId: string;
} {
  return {
    icon: (
      <CheckSquare2 className="h-3.5 w-3.5 text-[#0052CC] fill-[#DEEBFF]" />
    ),
    labelId: TASK_TYPE_LABEL_IDS[task.taskType],
  };
}

export function getPriorityIcon(priority: TaskPriority): React.ReactNode {
  switch (priority) {
    case TaskPriority.URGENT:
      return <ChevronsUp className="h-4 w-4 text-[#DE350B]" />;
    case TaskPriority.HIGH:
      return <ChevronUp className="h-4 w-4 text-[#FF8B00]" />;
    case TaskPriority.MEDIUM:
      return <Equal className="h-4 w-4 text-[#42526E]" />;
    case TaskPriority.LOW:
    default:
      return <ChevronDown className="h-4 w-4 text-[#0052CC]" />;
  }
}

export default function TaskCard({
  task,
  onClick,
  onOpenChat,
  canDrag = true,
}: {
  task: Task;
  onClick?: () => void;
  onOpenChat?: (task: Task) => void;
  canDrag?: boolean;
}) {
  const intl = useAppIntl();
  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const overdue = isOverdue(task.dueDate) && !isTerminalTaskStatus(task.status);
  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);
  const priorityIcon = getPriorityIcon(task.priority);
  const isDraggable = canDrag && !isTerminalTaskStatus(task.status);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`group w-full rounded border border-slate-200 bg-white p-3 text-left shadow-[0_1px_1px_rgba(9,30,66,0.25)] transition duration-150 hover:bg-[#F4F5F7] focus-visible:outline-none ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
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
      {(task.dueDate ||
        checklistTotal > 0 ||
        task.comments.length > 0 ||
        task.estimatedMinutes > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-slate-500">
          {/* Due date */}
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1 py-0.5 rounded ${
                overdue ? "bg-red-50 text-red-600" : "bg-slate-100"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {intl.formatDate(new Date(task.dueDate), {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}

          {/* Checklist */}
          {checklistTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1 py-0.5 rounded ${
                checklistDone === checklistTotal
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100"
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
          <TaskChatButton task={task} onOpenChat={onOpenChat} compact />
          {/* Priority Icon */}
          <div
            className="grid place-items-center h-5 w-5 rounded hover:bg-slate-200 transition"
            title={intl.formatMessage({ id: TASK_PRIORITY_LABEL_IDS[task.priority] })}
          >
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
    </div>
  );
}
