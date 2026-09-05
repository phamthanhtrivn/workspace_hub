import { useState, useMemo } from "react";
import {
  Check,
  CirclePlay,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
} from "lucide-react";
import {
  Sprint,
  SprintStatus,
  Task,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { FilePickerButton } from "./project-file-panel";
import TaskChatButton from "./task-chat-button";
import { TaskStatusBadge } from "./status-badge";

interface SprintCardProps {
  sprint: Sprint;
  dragOverTarget: string | null;
  onDragOver: (event: React.DragEvent, sprint: Sprint) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent, sprint: Sprint) => void | Promise<void>;
  onDragStart: (
    event: React.DragEvent,
    taskId: string,
    sprintId?: string,
  ) => void;
  canContribute: boolean;
  canManageSprints: boolean;
  canCreateTask: boolean;
  canEditTask: (task: Task) => boolean;
  filesBusy?: boolean;
  isBusy?: boolean;
  onAddFiles?: (
    files: FileList | File[],
    sprintId: string,
  ) => Promise<void> | void;
  onEditSprint: (sprint: Sprint) => void;
  onStartSprint: (sprintId: string) => Promise<void> | void;
  onCompleteSprint: (sprintId: string) => Promise<void> | void;
  onReopenSprint: (sprintId: string) => Promise<void> | void;
  onTaskClick?: (task: Task) => void;
  onOpenChat?: (task: Task) => void;
  onCreateSprintTask?: (
    sprintId: string,
    title: string,
  ) => Promise<void> | void;
}

export function SprintCard({
  sprint,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  canContribute,
  canManageSprints,
  canCreateTask,
  canEditTask,
  filesBusy = false,
  isBusy = false,
  onAddFiles,
  onEditSprint,
  onStartSprint,
  onCompleteSprint,
  onReopenSprint,
  onTaskClick,
  onOpenChat,
  onCreateSprintTask,
}: SprintCardProps) {
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    sprint.tasks.forEach((task) => {
      if (!task.parentTaskId) return;
      const children = map.get(task.parentTaskId) || [];
      children.push(task);
      map.set(task.parentTaskId, children);
    });
    return map;
  }, [sprint.tasks]);

  const rootTasks = useMemo(
    () => sprint.tasks.filter((task) => !task.parentTaskId),
    [sprint.tasks],
  );

  const handleInlineSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = inlineTitle.trim();
    if (!title || !onCreateSprintTask || isBusy) return;
    await onCreateSprintTask(sprint.id, title);
    setInlineTitle("");
    setIsInlineCreating(false);
  };

  const renderTaskRow = (task: Task, nested = false) => (
    <div
      key={task.id}
      draggable={canEditTask(task) && !isTerminalTaskStatus(task.status)}
      onDragStart={(event) => onDragStart(event, task.id, sprint.id)}
      className={`flex w-full items-center gap-3 py-2.5 pr-4 text-left hover:bg-slate-50 ${
        canEditTask(task) && !isTerminalTaskStatus(task.status)
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-default"
      } ${nested ? "border-t border-slate-100 bg-slate-50/50 pl-12" : "px-4"}`}
    >
      {nested && <span className="text-xs text-slate-400">↳</span>}
      <button
        type="button"
        onClick={() => onTaskClick?.(task)}
        className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-slate-700"
      >
        {task.title}
      </button>
      <TaskChatButton task={task} onOpenChat={onOpenChat} compact />
      <TaskStatusBadge status={task.status} compact />
    </div>
  );

  return (
    <section
      className={`overflow-hidden rounded border bg-white shadow-sm transition ${
        dragOverTarget === sprint.id
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-slate-200"
      }`}
      onDragOver={(event) => onDragOver(event, sprint)}
      onDragLeave={onDragLeave}
      onDrop={(event) => void onDrop(event, sprint)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          {sprint.status === SprintStatus.ACTIVE ? (
            <CirclePlay className="h-4 w-4 text-blue-600" />
          ) : (
            <Rocket className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <h3 className="text-sm font-black text-[#172B4D]">{sprint.name}</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              {sprint.startDate?.slice(0, 10)} → {sprint.endDate?.slice(0, 10)}{" "}
              · {sprint.tasks.length} task
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
            {sprint.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canContribute && (
            <FilePickerButton
              compact
              disabled={filesBusy}
              label="Thêm tệp"
              onFiles={(files: FileList | File[]) =>
                void onAddFiles?.(files, sprint.id)
              }
            />
          )}
          {canManageSprints && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onEditSprint(sprint)}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
            </button>
          )}
          {canManageSprints && sprint.status === SprintStatus.PLANNED && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onStartSprint(sprint.id)}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              <CirclePlay className="h-3.5 w-3.5" /> Start sprint
            </button>
          )}
          {canManageSprints && sprint.status === SprintStatus.ACTIVE && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onCompleteSprint(sprint.id)}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Complete sprint
            </button>
          )}
          {canManageSprints && sprint.status === SprintStatus.COMPLETED && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onReopenSprint(sprint.id)}
              className="inline-flex items-center gap-1 rounded border border-blue-200 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen sprint
            </button>
          )}
        </div>
      </div>
      {sprint.goal && (
        <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
          Goal: {sprint.goal}
        </p>
      )}
      <div className="divide-y divide-slate-100">
        {sprint.tasks.length > 0 ? (
          (rootTasks.length > 0 ? rootTasks : sprint.tasks).flatMap((task) => [
            renderTaskRow(task),
            ...(childrenByParent.get(task.id) || []).map((child) =>
              renderTaskRow(child, true),
            ),
          ])
        ) : (
          <div className="px-4 py-6 text-center text-xs font-semibold text-slate-400">
            Chưa có task trong Sprint.
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5">
        {canCreateTask &&
          canManageSprints &&
          sprint.status === SprintStatus.PLANNED &&
          (isInlineCreating ? (
            <form
              onSubmit={(event) => void handleInlineSubmit(event)}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={inlineTitle}
                onChange={(event) => setInlineTitle(event.target.value)}
                placeholder="Nhập tên task..."
                className="min-w-0 flex-1 rounded border border-blue-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={isBusy || !inlineTitle.trim()}
                className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Tạo
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInlineCreating(false);
                  setInlineTitle("");
                }}
                className="rounded px-2 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsInlineCreating(true);
                setInlineTitle("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              <Plus className="h-3.5 w-3.5" /> Tạo task trong Sprint
            </button>
          ))}
      </div>
    </section>
  );
}
