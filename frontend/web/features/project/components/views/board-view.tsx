"use client";

import { useState } from "react";
import {
  type Task,
  TaskPriority,
  TaskStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import TaskCard from "../ui/task-card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectConfirmDialog from "../ui/project-confirm-dialog";
import { TASK_STATUS_OPTIONS } from "../../constants/task.constants";
import { canMoveTaskToStatus } from "../../task-status-transition";

function getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status);
}

function getTaskStatusLabel(status: TaskStatus): string {
  return (
    TASK_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

const COLUMNS: {
  status: TaskStatus;
  label: string;
  headerColor: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    status: TaskStatus.TODO,
    label: "TO DO",
    headerColor: "text-muted-foreground",
    badgeBg: "bg-muted",
    badgeText: "text-muted-foreground",
  },
  {
    status: TaskStatus.IN_PROGRESS,
    label: "IN PROGRESS",
    headerColor: "text-info-content",
    badgeBg: "bg-primary-soft",
    badgeText: "text-info-content",
  },
  {
    status: TaskStatus.IN_REVIEW,
    label: "IN REVIEW",
    headerColor: "text-warning-content",
    badgeBg: "bg-warning-soft",
    badgeText: "text-warning-content",
  },
  {
    status: TaskStatus.DONE,
    label: "DONE",
    headerColor: "text-success-content",
    badgeBg: "bg-success-soft",
    badgeText: "text-success-content",
  },
  {
    status: TaskStatus.CANCELLED,
    label: "CANCELLED",
    headerColor: "text-destructive-content",
    badgeBg: "bg-destructive-soft",
    badgeText: "text-destructive-content",
  },
];

export default function BoardView({
  tasks,
  onTaskClick,
  onTaskMove,
  onTaskPriorityChange,
  onAddTask,
  onOpenChat,
  canMoveTask = () => false,
  canEditTask = () => false,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void | Promise<void>;
  onTaskPriorityChange?: (taskId: string, priority: TaskPriority) => void | Promise<void>;
  onAddTask?: (status: TaskStatus) => void;
  onOpenChat?: (task: Task) => void;
  canMoveTask?: (task: Task) => boolean;
  canEditTask?: (task: Task) => boolean;
}) {
  const [pendingDrop, setPendingDrop] = useState<{
    task: Task;
    targetStatus: TaskStatus;
  } | null>(null);
  const [isConfirmingMove, setIsConfirmingMove] = useState(false);

  const handleDrop = (taskId: string, targetStatus: TaskStatus) => {
    if (!taskId || !onTaskMove) return;

    const task = tasks.find((item) => item.id === taskId);
    if (
      !task ||
      task.status === targetStatus ||
      !canMoveTask(task) ||
      !canMoveTaskToStatus(task, targetStatus)
    ) {
      return;
    }

    setPendingDrop({ task, targetStatus });
  };

  const handleConfirmMove = async () => {
    if (!pendingDrop || !onTaskMove) return;

    setIsConfirmingMove(true);
    try {
      await onTaskMove(pendingDrop.task.id, pendingDrop.targetStatus);
      setPendingDrop(null);
    } finally {
      setIsConfirmingMove(false);
    }
  };

  const handleCancelMove = () => {
    if (isConfirmingMove) return;
    setPendingDrop(null);
  };

  return (
    <>
      <div className="h-full min-h-0 min-w-0 overflow-x-auto overscroll-x-contain pb-2" role="region" aria-label="Kanban board" tabIndex={0}>
        <div className="grid h-full min-h-0 grid-cols-[repeat(5,minmax(200px,1fr))] gap-[12px]">
          {COLUMNS.map((col) => {
            const columnTasks = getTasksByStatus(tasks, col.status);
            const canCreateInColumn = col.status === TaskStatus.TODO;

            return (
              <div
                key={col.status}
                className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-panel bg-muted p-2.5"
                onDragOver={(e) => {
                  if (onTaskMove) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(e.dataTransfer.getData("text/plain"), col.status);
                }}
              >
                {/* Column header */}
                <div className="z-10 -mx-2.5 flex shrink-0 items-center justify-between gap-2 rounded-t-2xl bg-muted px-3 pb-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-xs font-semibold tracking-wider ${col.headerColor}`}
                    >
                      {col.label}
                    </h3>
                    <span
                      className={`inline-flex items-center justify-center h-5 px-1.5 rounded-full text-xs font-semibold ${col.badgeBg} ${col.badgeText}`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                  {canCreateInColumn && onAddTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAddTask(col.status)}
                      className="h-6 w-6 rounded-control text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer"
                      title={`Create task in ${col.label}`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  )}
                </div>

                {/* Task cards list */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [&>div]:shrink-0">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      density="compact"
                      onClick={() => onTaskClick?.(task)}
                      onOpenChat={onOpenChat}
                      canDrag={Boolean(onTaskMove) && canMoveTask(task)}
                      onPriorityChange={
                        onTaskPriorityChange &&
                        canEditTask(task) &&
                        !isTerminalTaskStatus(task.status)
                          ? onTaskPriorityChange
                          : undefined
                      }
                    />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-panel border border-dashed border-input py-10 text-xs font-medium text-muted-foreground bg-background">
                      <span>No tasks</span>
                      {onAddTask && canCreateInColumn && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => onAddTask(col.status)}
                          className="mt-2 h-auto p-0 inline-flex items-center gap-1 font-semibold text-info-content hover:underline cursor-pointer"
                        >
                          <Plus className="h-3 w-3" strokeWidth={2.5} />
                          Add Task
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline quick create button at bottom (if tasks exist) */}
                {columnTasks.length > 0 && onAddTask && canCreateInColumn && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddTask(col.status)}
                    className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold rounded-control text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer text-left px-2"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Create Task</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ProjectConfirmDialog
        open={Boolean(pendingDrop)}
        title={
          pendingDrop
            ? `Move task to ${getTaskStatusLabel(pendingDrop.targetStatus)}?`
            : "Move task?"
        }
        description={
          pendingDrop
            ? `Move "${pendingDrop.task.title}" from ${getTaskStatusLabel(
                pendingDrop.task.status,
              )} to ${getTaskStatusLabel(pendingDrop.targetStatus)}.`
            : undefined
        }
        confirmLabel="Move task"
        cancelLabel="Cancel"
        variant="question"
        isLoading={isConfirmingMove}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />
    </>
  );
}
