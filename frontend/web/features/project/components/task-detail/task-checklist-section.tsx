"use client";

import { useState } from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskChecklist } from "@/features/project/types/project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskChecklistSectionProps {
  task: Task;
  isReadOnly: boolean;
  onCreate?: (taskId: string, title: string) => Promise<TaskChecklist>;
  onUpdate?: (
    checklistId: string,
    completed: boolean,
  ) => Promise<TaskChecklist>;
  onDelete?: (checklistId: string) => Promise<void>;
}

export default function TaskChecklistSection({
  task,
  isReadOnly,
  onCreate,
  onUpdate,
  onDelete,
}: TaskChecklistSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const completedCount = task.checklists.filter(
    (item) => item.completed,
  ).length;
  const totalCount = task.checklists.length;
  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (isReadOnly || !nextTitle || !onCreate) return;
    try {
      await onCreate(task.id, nextTitle);
      setTitle("");
      setIsAdding(false);
      toast.success("Checklist item added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add checklist item",
      );
    }
  };

  const handleUpdate = async (item: TaskChecklist) => {
    if (isReadOnly || !onUpdate) return;
    try {
      await onUpdate(item.id, !item.completed);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update checklist item",
      );
    }
  };

  const handleDelete = async (checklistId: string) => {
    if (isReadOnly || !onDelete) return;
    try {
      await onDelete(checklistId);
      toast.success("Checklist item deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete checklist item",
      );
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
        </h3>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          )}
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding((value) => !value)}
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-info-soft hover:text-info-content cursor-pointer"
              title="Add checklist item"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isAdding && !isReadOnly && (
        <form
          onSubmit={(event) => void handleCreate(event)}
          className="mt-2 flex items-center gap-2"
        >
          <Input aria-label="Add an item"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an item..."
            className="h-8 min-w-0 flex-1 rounded-control border-input text-xs font-semibold focus-visible:border-primary"
          />
          <Button
            type="submit"
            disabled={!title.trim()}
            className="h-8 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
          >
            Add
          </Button>
        </form>
      )}

      {totalCount ? (
        <div className="space-y-1.5">
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success-content transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-1 bg-card">
            {task.checklists.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-background"
                }`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => void handleUpdate(item)}
                  disabled={isReadOnly}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success-outline cursor-pointer"
                />
                <span
                  className={
                    item.completed
                      ? "font-medium text-muted-foreground line-through select-none"
                      : "font-semibold text-foreground select-none"
                  }
                >
                  {item.title}
                </span>
                {onDelete && !isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDelete(item.id)}
                    className="ml-auto h-6 w-6 rounded text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-panel border border-dashed border-border bg-background py-4 text-center text-xs font-semibold text-muted-foreground">
          No checklist items yet.
        </div>
      )}
    </div>
  );
}
