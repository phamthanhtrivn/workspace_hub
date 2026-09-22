"use client";

import {
  type Task,
  TaskPriority,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import TaskLabelBadges from "./task-label-badges";
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
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
} from "@/features/project/constants/task.constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getIssueKey(task: Task): string {
  return `TASK-${task.taskNumber}`;
}

export function getIssueIcon(): React.ReactNode {
  return <CheckSquare2 className="h-3.5 w-3.5 text-[#0052CC] fill-[#DEEBFF]" />;
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
  onPriorityChange,
  density = "default",
  canDrag = true,
}: {
  task: Task;
  onClick?: () => void;
  onOpenChat?: (task: Task) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void | Promise<void>;
  density?: "default" | "compact";
  canDrag?: boolean;
}) {
  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const overdue = isOverdue(task.dueDate) && !isTerminalTaskStatus(task.status);
  const issueKey = getIssueKey(task);
  const issueIcon = getIssueIcon();
  const priorityIcon = getPriorityIcon(task.priority);
  const isDraggable = canDrag && !isTerminalTaskStatus(task.status);
  const isCompact = density === "compact";

  const handleDragStart = (e: React.DragEvent) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest("[data-card-interactive='true']")
    ) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

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
      onDragStart={handleDragStart}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative w-full overflow-visible rounded-xl border border-slate-200 bg-white text-left shadow-2xs transition duration-150 hover:z-20 hover:border-slate-300 hover:bg-slate-50/70 focus-within:z-20 focus-visible:outline-hidden ${
        isCompact ? "p-2.5" : "p-3"
      } ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
    >
      {/* Title */}
      <p
        className={`font-semibold leading-snug text-[#172B4D] group-hover:text-[#0052CC] break-words ${
          isCompact ? "text-[13px]" : "text-sm"
        }`}
      >
        {task.title}
      </p>

      {/* Labels */}
      <TaskLabelBadges labels={task.labels} className={isCompact ? "mt-1.5" : "mt-2"} />

      {/* Meta indicators */}
      {(task.dueDate ||
        checklistTotal > 0 ||
        task.comments.length > 0 ||
        task.estimatedMinutes > 0) && (
        <div
          className={`flex flex-wrap items-center gap-y-1 text-[11px] font-semibold text-slate-500 ${
            isCompact ? "mt-2 gap-x-2" : "mt-2.5 gap-x-2.5"
          }`}
        >
          {/* Due date */}
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                overdue ? "bg-red-50 text-red-600" : "bg-slate-100"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {formattedDueDate}
            </span>
          )}

          {/* Checklist */}
          {checklistTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
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
            <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}

          {/* Estimate */}
          {task.estimatedMinutes > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h`
                : `${task.estimatedMinutes}m`}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Issue Key / Type & Priority / Assignees */}
      <div
        className={`border-t border-slate-100 flex items-center justify-between ${
          isCompact ? "mt-2 pt-2" : "mt-3 pt-2.5"
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none">
          {issueIcon}
          <span className="hover:underline font-semibold text-[11px] uppercase tracking-wide">
            {issueKey}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TaskChatButton task={task} onOpenChat={onOpenChat} compact />
          {onPriorityChange && !isTerminalTaskStatus(task.status) ? (
            <TaskPrioritySelect
              task={task}
              onPriorityChange={onPriorityChange}
            />
          ) : (
            <div
              className="grid place-items-center h-5 w-5 rounded-md hover:bg-slate-200 transition"
              title={TASK_PRIORITY_LABELS[task.priority]}
            >
              {priorityIcon}
            </div>
          )}

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

function TaskPrioritySelect({
  task,
  onPriorityChange,
}: {
  task: Task;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void | Promise<void>;
}) {
  const issueKey = getIssueKey(task);

  const handleChange = (priority: TaskPriority) => {
    if (priority === task.priority) return;
    void onPriorityChange(task.id, priority);
  };

  const stopCardInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      data-card-interactive="true"
      onClick={stopCardInteraction}
      onPointerDown={stopCardInteraction}
      onKeyDown={stopCardInteraction}
    >
      <Select value={task.priority} onValueChange={(value) => handleChange(value as TaskPriority)}>
        <SelectTrigger
          aria-label={`Change priority for ${issueKey}`}
          title={TASK_PRIORITY_LABELS[task.priority]}
          className="grid h-6 w-6 place-items-center rounded-md border-0 bg-transparent p-0 text-slate-500 shadow-none transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-[#0052CC]/30 [&>svg:last-child]:hidden"
        >
          <SelectValue>
            <span className="grid h-5 w-5 place-items-center">
              {getPriorityIcon(task.priority)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="min-w-36 rounded-xl border-slate-200 shadow-lg"
          onClick={stopCardInteraction}
        >
          {TASK_PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs font-semibold">
              <span className="flex items-center gap-2">
                <span className="grid h-4 w-4 place-items-center">
                  {getPriorityIcon(option.value)}
                </span>
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
