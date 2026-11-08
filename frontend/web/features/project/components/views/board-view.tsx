"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  type Task,
  TaskPriority,
  TaskStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import TaskCard from "../ui/task-card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERMISSION_REASON } from "@/lib/permission-feedback";
import ProjectConfirmDialog from "../ui/project-confirm-dialog";
import { TASK_STATUS_OPTIONS } from "../../constants/task.constants";
import { canMoveTaskToStatus, getTaskStatusTransitionReason } from "../../task-status-transition";

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
  allTasks = tasks,
  onTaskClick,
  onTaskMove,
  onTaskPriorityChange,
  onAddTask,
  onOpenChat,
  canMoveTask = () => false,
  canEditTask = () => false,
}: {
  tasks: Task[];
  allTasks?: Task[];
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const draggedTask = tasks.find((task) => task.id === draggedTaskId);

  const handleDrop = (taskId: string, targetStatus: TaskStatus) => {
    if (!taskId || !onTaskMove) return;

    const task = tasks.find((item) => item.id === taskId);
    if (
      !task ||
      task.status === targetStatus ||
      !canMoveTask(task) ||
      !canMoveTaskToStatus(task, targetStatus, allTasks)
    ) {
      return;
    }

    setPendingDrop({ task, targetStatus });
  };

  const handleConfirmMove = async () => {
    if (!pendingDrop || !onTaskMove) return;
    const currentTask = allTasks.find((task) => task.id === pendingDrop.task.id);
    if (!currentTask || !canMoveTask(currentTask)) {
      setPendingDrop(null);
      return;
    }
    const restriction = getTaskStatusTransitionReason(currentTask, pendingDrop.targetStatus, allTasks);
    if (restriction) {
      toast.error(restriction);
      setPendingDrop(null);
      return;
    }

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
      <div className="h-full min-h-0 min-w-0 overflow-x-auto overscroll-x-contain pb-2" role="region" aria-label="Kanban board" tabIndex={0}
        onDragStart={(event) => setDraggedTaskId(event.dataTransfer.getData("text/plain") || null)}
        onDragEnd={() => setDraggedTaskId(null)}
      >
        <div className="grid h-full min-h-0 grid-cols-[repeat(5,minmax(200px,1fr))] gap-[12px]">
          {COLUMNS.map((col) => {
            const columnTasks = getTasksByStatus(tasks, col.status);
            const canCreateInColumn = col.status === TaskStatus.TODO;
            const restriction = draggedTask && col.status !== draggedTask.status
              ? getTaskStatusTransitionReason(draggedTask, col.status, allTasks) : undefined;

            return (
              <div
                key={col.status}
                role="group"
                aria-label={col.label}
                aria-disabled={restriction ? true : undefined}
                title={restriction}
                className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-panel bg-muted p-2.5 transition-opacity ${restriction ? "opacity-50" : ""}`}
                onDragOver={(e) => {
                  if (onTaskMove && draggedTask && canMoveTask(draggedTask) && canMoveTaskToStatus(draggedTask, col.status, allTasks)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  } else {
                    e.dataTransfer.dropEffect = "none";
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggedTaskId(null);
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
                  {canCreateInColumn && (
                    <Button
                      disabledReason={!onAddTask ? PERMISSION_REASON.projectCreateTask : undefined}
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAddTask?.(col.status)}
                      className="h-6 w-6 rounded-control text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer"
                      title={`Create task in ${col.label}`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  )}
                </div>

                {/* Task cards list */}
                {restriction && <p className="mb-2 text-xs text-muted-foreground" role="status">{restriction}</p>}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [&>div]:shrink-0">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      density="compact"
                      onClick={() => onTaskClick?.(task)}
                      onOpenChat={onOpenChat}
                      canDrag={Boolean(onTaskMove) && !task.archived && canMoveTask(task)}
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
                      {canCreateInColumn && (
                        <Button
                          disabledReason={!onAddTask ? PERMISSION_REASON.projectCreateTask : undefined}
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => onAddTask?.(col.status)}
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
                {columnTasks.length > 0 && canCreateInColumn && (
                  <Button
                    disabledReason={!onAddTask ? PERMISSION_REASON.projectCreateTask : undefined}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddTask?.(col.status)}
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
