"use client";

import { CheckCircle2, ListTree, Plus } from "lucide-react";
import { TaskStatus, type Task } from "@/features/project/types/project";
import { TaskStatusBadge } from "../ui/status-badge";
import { Button } from "@/components/ui/button";

interface TaskSubtasksSectionProps {
  task: Task;
  tasks: Task[];
  isReadOnly: boolean;
  onCreateSubtask?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onMarkParentDone?: () => Promise<void> | void;
}

export default function TaskSubtasksSection({
  task,
  tasks,
  isReadOnly,
  onCreateSubtask,
  onTaskClick,
  onMarkParentDone,
}: TaskSubtasksSectionProps) {
  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id,
  );
  const openChildTasks = childTasks.filter(
    (candidate) => !candidate.archived && candidate.status !== TaskStatus.DONE,
  );
  const canMarkParentDone =
    childTasks.length > 0 &&
    openChildTasks.length === 0 &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED &&
    !isReadOnly;
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ListTree className="h-3.5 w-3.5" />
          <span>{task.parentTaskId ? "Parent Task" : "Subtasks"}</span>
        </h3>
        {onCreateSubtask && !task.parentTaskId && !isReadOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCreateSubtask(task)}
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Add Subtask"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {canMarkParentDone && (
        <div className="flex items-center justify-between gap-3 rounded-panel border border-border bg-success-soft px-3 py-2 text-xs text-success-content">
          <span className="font-semibold">All subtasks are done.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onMarkParentDone?.()}
            className="h-7 shrink-0 cursor-pointer gap-1.5 rounded-control border-success-outline bg-card px-2.5 text-xs font-semibold text-success-content hover:bg-success-soft"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark parent done
          </Button>
        </div>
      )}

      {parentTask && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onTaskClick?.(parentTask)}
          className="mb-1.5 flex h-auto w-full cursor-pointer items-center justify-between gap-2 rounded-control border border-border bg-background px-3 py-2 text-left text-xs transition hover:border-input hover:bg-muted font-normal"
        >
          <span className="min-w-0 truncate font-semibold text-info-content">
            {parentTask.title}
          </span>
          <TaskStatusBadge status={parentTask.status} compact />
        </Button>
      )}

      {childTasks.length > 0 ? (
        <div className="space-y-1.5">
          {childTasks.map((child) => (
            <Button
              key={child.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onTaskClick?.(child)}
              className="flex h-auto w-full cursor-pointer items-center justify-between rounded-control border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-input hover:bg-background font-normal"
            >
              <span className="min-w-0 truncate pr-2 font-semibold text-foreground">
                {child.title}
              </span>
              <TaskStatusBadge status={child.status} compact />
            </Button>
          ))}
        </div>
      ) : (
        !task.parentTaskId && (
          <div className="rounded-panel border border-dashed border-border bg-background py-4 text-center text-xs font-semibold text-muted-foreground">
            No subtasks created yet.
          </div>
        )
      )}
    </div>
  );
}
