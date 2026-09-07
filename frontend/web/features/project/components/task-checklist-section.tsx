"use client";

import { useState } from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskChecklist } from "../types/project";

interface TaskChecklistSectionProps {
  task: Task;
  isReadOnly: boolean;
  onCreate?: (taskId: string, title: string) => Promise<TaskChecklist>;
  onUpdate?: (checklistId: string, completed: boolean) => Promise<TaskChecklist>;
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
  const completedCount = task.checklists.filter((item) => item.completed).length;
  const totalCount = task.checklists.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (isReadOnly || !nextTitle || !onCreate) return;
    try {
      await onCreate(task.id, nextTitle);
      setTitle("");
      setIsAdding(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm checklist");
    }
  };

  const handleUpdate = async (item: TaskChecklist) => {
    if (isReadOnly || !onUpdate) return;
    try {
      await onUpdate(item.id, !item.completed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật checklist");
    }
  };

  const handleDelete = async (checklistId: string) => {
    if (isReadOnly || !onDelete) return;
    try {
      await onDelete(checklistId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa checklist");
    }
  };

  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
        </h3>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-[10px] font-bold text-slate-500">
              {completedCount}/{totalCount} ({progress}%)
            </span>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsAdding((value) => !value)}
              className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
              title="Thêm checklist"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isAdding && !isReadOnly && (
        <form onSubmit={(event) => void handleCreate(event)} className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nhập nội dung checklist..."
            className="min-w-0 flex-1 rounded border border-blue-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
          >
            Thêm
          </button>
        </form>
      )}

      {totalCount ? (
        <div className="space-y-1">
          <div className="mb-2 h-1 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-[#36B37E] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-0.5 bg-white">
            {task.checklists.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2 rounded border border-transparent px-2 py-1.5 text-xs ${isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => void handleUpdate(item)}
                  disabled={isReadOnly}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#36B37E] accent-[#36B37E]"
                />
                <span className={item.completed ? "font-medium text-slate-400 line-through" : "font-medium text-slate-700"}>
                  {item.title}
                </span>
                {onDelete && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="ml-auto rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    title="Xóa checklist"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50/30 py-4 text-center text-[11px] font-semibold text-slate-400">
          Không có checklist.
        </div>
      )}
    </div>
  );
}
