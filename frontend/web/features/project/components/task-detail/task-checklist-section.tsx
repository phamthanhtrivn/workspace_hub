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
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
        </h3>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-[11px] font-bold text-slate-500">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          )}
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding((value) => !value)}
              className="h-7 w-7 p-0 text-slate-400 hover:bg-blue-50 hover:text-[#0052CC] cursor-pointer"
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
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an item..."
            className="h-8 min-w-0 flex-1 rounded-lg border-slate-300 text-xs font-semibold focus-visible:border-[#0052CC]"
          />
          <Button
            type="submit"
            disabled={!title.trim()}
            className="h-8 rounded-lg bg-[#0052CC] px-3 text-xs font-bold text-white hover:bg-[#0747A6] disabled:opacity-50 cursor-pointer"
          >
            Add
          </Button>
        </form>
      )}

      {totalCount ? (
        <div className="space-y-1.5">
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-1 bg-white">
            {task.checklists.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50"
                }`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => void handleUpdate(item)}
                  disabled={isReadOnly}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                />
                <span
                  className={
                    item.completed
                      ? "font-medium text-slate-400 line-through select-none"
                      : "font-semibold text-slate-700 select-none"
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
                    className="ml-auto h-6 w-6 rounded text-slate-300 hover:bg-red-50 hover:text-red-500 cursor-pointer"
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
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-4 text-center text-xs font-semibold text-slate-400">
          No checklist items yet.
        </div>
      )}
    </div>
  );
}
