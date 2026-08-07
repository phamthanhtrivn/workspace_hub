"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CirclePlay,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  X,
} from "lucide-react";
import {
  SprintStatus,
  TaskStatus,
  type Sprint,
  type Task,
} from "@/features/project/types/project";
import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "../shared/status-badge";
import TaskChatButton from "../task/task-chat-button";
import ProjectFilePanel, {
  createProjectFileItems,
  FilePickerButton,
  type ProjectFileItem,
} from "../project/project-file-panel";

export interface SprintCreateValues {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

export default function SoftwareBacklogView({
  tasks,
  sprints,
  onTaskClick,
  onOpenChat,
  onCreateTask,
  onCreateSprintTask,
  onCreateSprint,
  onUpdateSprint,
  onAddTasksToSprint,
  onBulkUpdateTasks,
  onRemoveTaskFromSprint,
  onStartSprint,
  onCompleteSprint,
  onReopenSprint,
  isBusy = false,
}: {
  tasks: Task[];
  sprints: Sprint[];
  onTaskClick?: (task: Task) => void;
  onOpenChat?: (task: Task) => void;
  onCreateTask?: (sprintId?: string) => void;
  onCreateSprintTask?: (sprintId: string, title: string) => Promise<void>;
  onCreateSprint: (values: SprintCreateValues) => Promise<void>;
  onUpdateSprint: (
    sprintId: string,
    values: SprintCreateValues,
  ) => Promise<void>;
  onAddTasksToSprint: (sprintId: string, taskIds: string[]) => Promise<void>;
  onBulkUpdateTasks?: (taskIds: string[], status: TaskStatus) => Promise<void>;
  onRemoveTaskFromSprint?: (sprintId: string, taskId: string) => Promise<void>;
  onStartSprint: (sprintId: string) => Promise<void>;
  onCompleteSprint: (sprintId: string) => Promise<void>;
  onReopenSprint: (sprintId: string) => Promise<void>;
  isBusy?: boolean;
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>(
    TaskStatus.IN_PROGRESS,
  );
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [inlineSprintId, setInlineSprintId] = useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectFiles, setProjectFiles] = useState<ProjectFileItem[]>([]);

  const addFiles = (files: File[], scopeLabel: string) => {
    setProjectFiles((current) => [
      ...current,
      ...createProjectFileItems(files, scopeLabel),
    ]);
  };

  const removeFile = (file: ProjectFileItem) => {
    URL.revokeObjectURL(file.url);
    setProjectFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const activeTasks = tasks.filter((task) => !task.archived);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    activeTasks.forEach((task) => {
      if (!task.parentTaskId) return;
      const children = map.get(task.parentTaskId) || [];
      children.push(task);
      map.set(task.parentTaskId, children);
    });
    return map;
  }, [activeTasks]);
  const backlogTasks = activeTasks.filter(
    (task) => !task.sprintId && !task.parentTaskId,
  );
  const plannedSprints = sprints.filter(
    (sprint) => sprint.status === SprintStatus.PLANNED,
  );

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const handleAddTasks = async () => {
    if (!targetSprintId || selectedTaskIds.length === 0) return;
    await onAddTasksToSprint(targetSprintId, selectedTaskIds);
    setSelectedTaskIds([]);
  };

  const handleBulkStatus = async () => {
    if (!onBulkUpdateTasks || selectedTaskIds.length === 0) return;
    await onBulkUpdateTasks(selectedTaskIds, bulkStatus);
    setSelectedTaskIds([]);
  };

  const handleCreateSprint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate || isBusy) return;
    const values = { name: name.trim(), goal: goal.trim(), startDate, endDate };
    if (editingSprint) {
      await onUpdateSprint(editingSprint.id, values);
    } else {
      await onCreateSprint(values);
    }
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setEditingSprint(null);
    setShowCreateSprint(false);
  };

  const openCreateSprint = () => {
    setEditingSprint(null);
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setShowCreateSprint(true);
  };

  const openEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setName(sprint.name);
    setGoal(sprint.goal || "");
    setStartDate(sprint.startDate?.slice(0, 10) || "");
    setEndDate(sprint.endDate?.slice(0, 10) || "");
    setShowCreateSprint(true);
  };

  const handleInlineSprintTask = async (
    event: React.FormEvent,
    sprintId: string,
  ) => {
    event.preventDefault();
    const title = inlineTaskTitle.trim();
    if (!title || !onCreateSprintTask || isBusy) return;
    await onCreateSprintTask(sprintId, title);
    setInlineTaskTitle("");
    setInlineSprintId(null);
  };

  const handleDragStart = (
    event: React.DragEvent,
    taskId: string,
    sprintId?: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-project-task",
      JSON.stringify({ taskId, sprintId }),
    );
  };

  const readDragPayload = (
    event: React.DragEvent,
  ): { taskId: string; sprintId?: string } | null => {
    try {
      const payload = JSON.parse(
        event.dataTransfer.getData("application/x-project-task"),
      );
      return payload?.taskId ? payload : null;
    } catch {
      return null;
    }
  };

  const handleDropOnSprint = async (event: React.DragEvent, sprint: Sprint) => {
    event.preventDefault();
    setDragOverTarget(null);
    if (sprint.status !== SprintStatus.PLANNED || !onAddTasksToSprint) return;
    const payload = readDragPayload(event);
    if (!payload || payload.sprintId === sprint.id) return;
    await onAddTasksToSprint(sprint.id, [payload.taskId]);
  };

  const handleDropOnBacklog = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverTarget(null);
    const payload = readDragPayload(event);
    if (!payload?.sprintId || !onRemoveTaskFromSprint) return;
    await onRemoveTaskFromSprint(payload.sprintId, payload.taskId);
  };

  return (
    <div className="space-y-5">
      <ProjectFilePanel
        files={projectFiles}
        onAddFiles={(files) => addFiles(files, "Project")}
        onRemoveFile={removeFile}
      />
      <section
        className={cn(
          "overflow-hidden rounded border bg-white shadow-sm transition",
          dragOverTarget === "backlog"
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-slate-200",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOverTarget("backlog");
        }}
        onDragLeave={() => setDragOverTarget(null)}
        onDrop={(event) => void handleDropOnBacklog(event)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-sm font-black text-[#172B4D]">Backlog</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Chọn task để đưa vào Sprint.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCreateTask?.()}
              className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo task
            </button>
            <button
              type="button"
              onClick={openCreateSprint}
              className="inline-flex items-center gap-1.5 rounded bg-[#0052CC] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0747A6]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create sprint
            </button>
          </div>
        </div>

        {selectedTaskIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
            <span className="text-xs font-bold text-blue-800">
              {selectedTaskIds.length} task đã chọn
            </span>
            <select
              value={targetSprintId}
              onChange={(event) => setTargetSprintId(event.target.value)}
              className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="">Chọn Sprint...</option>
              {plannedSprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!targetSprintId || isBusy}
              onClick={() => void handleAddTasks()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đưa vào Sprint
            </button>
            <select
              value={bulkStatus}
              onChange={(event) =>
                setBulkStatus(event.target.value as TaskStatus)
              }
              className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
              aria-label="Trạng thái mới cho task đã chọn"
            >
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.IN_REVIEW}>In Review</option>
              <option value={TaskStatus.DONE}>Done</option>
            </select>
            <button
              type="button"
              disabled={isBusy || !onBulkUpdateTasks}
              onClick={() => void handleBulkStatus()}
              className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 disabled:opacity-50"
            >
              Đổi trạng thái
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {backlogTasks.length > 0 ? (
            backlogTasks.map((task) => {
              const children = childrenByParent.get(task.id) || [];
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="h-4 w-4 accent-[#0052CC]"
                      aria-label={`Chọn ${task.title}`}
                    />
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      onClick={() => onTaskClick?.(task)}
                      className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
                    >
                      <span className="block truncate text-xs font-bold text-[#172B4D]">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                        {task.id.slice(0, 8).toUpperCase()}
                      </span>
                    </button>
                    <TaskChatButton
                      task={task}
                      onOpenChat={onOpenChat}
                      compact
                    />
                    <TaskStatusBadge status={task.status} compact />
                  </div>
                  {children
                    .filter((child) => !child.sprintId)
                    .map((child) => (
                      <div
                        key={child.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onTaskClick?.(child)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onTaskClick?.(child);
                          }
                        }}
                        className="flex w-full items-center gap-3 border-t border-slate-100 bg-slate-50/50 py-2 pl-14 pr-4 text-left hover:bg-slate-100"
                      >
                        <span className="text-xs text-slate-400">↳</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                          {child.title}
                        </span>
                        <TaskChatButton
                          task={child}
                          onOpenChat={onOpenChat}
                          compact
                        />
                        <TaskStatusBadge status={child.status} compact />
                      </div>
                    ))}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-10 text-center text-xs font-semibold text-slate-400">
              Backlog đang trống. Hãy tạo task hoặc hoàn thành Sprint hiện tại.
            </div>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {sprints.map((sprint) => {
          const childrenByParent = new Map<string, Task[]>();
          sprint.tasks.forEach((task) => {
            if (!task.parentTaskId) return;
            const children = childrenByParent.get(task.parentTaskId) || [];
            children.push(task);
            childrenByParent.set(task.parentTaskId, children);
          });
          const rootTasks = sprint.tasks.filter((task) => !task.parentTaskId);
          const renderTaskRow = (task: Task, nested = false) => (
            <div
              key={task.id}
              draggable
              onDragStart={(event) =>
                handleDragStart(event, task.id, sprint.id)
              }
              className={cn(
                "flex w-full cursor-grab items-center gap-3 py-2.5 pr-4 text-left hover:bg-slate-50 active:cursor-grabbing",
                nested
                  ? "border-t border-slate-100 bg-slate-50/50 pl-12"
                  : "px-4",
              )}
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
              key={sprint.id}
              className={cn(
                "overflow-hidden rounded border bg-white shadow-sm transition",
                dragOverTarget === sprint.id
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-slate-200",
              )}
              onDragOver={(event) => {
                if (sprint.status === SprintStatus.PLANNED) {
                  event.preventDefault();
                  setDragOverTarget(sprint.id);
                }
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={(event) => void handleDropOnSprint(event, sprint)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  {sprint.status === SprintStatus.ACTIVE ? (
                    <CirclePlay className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Rocket className="h-4 w-4 text-slate-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-black text-[#172B4D]">
                      {sprint.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {sprint.startDate?.slice(0, 10)} →{" "}
                      {sprint.endDate?.slice(0, 10)} · {sprint.tasks.length}{" "}
                      task
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                    {sprint.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FilePickerButton
                    compact
                    label="Add file"
                    onFiles={(files) =>
                      addFiles(files, `Sprint: ${sprint.name}`)
                    }
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => openEditSprint(sprint)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                  </button>
                  {sprint.status === SprintStatus.PLANNED && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onStartSprint(sprint.id)}
                      className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <CirclePlay className="h-3.5 w-3.5" /> Start sprint
                    </button>
                  )}
                  {sprint.status === SprintStatus.ACTIVE && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onCompleteSprint(sprint.id)}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Complete sprint
                    </button>
                  )}
                  {sprint.status === SprintStatus.COMPLETED && (
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
                  (rootTasks.length > 0 ? rootTasks : sprint.tasks).flatMap(
                    (task) => [
                      renderTaskRow(task),
                      ...(childrenByParent.get(task.id) || []).map((child) =>
                        renderTaskRow(child, true),
                      ),
                    ],
                  )
                ) : (
                  <div className="px-4 py-6 text-center text-xs font-semibold text-slate-400">
                    Chưa có task trong Sprint.
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-2.5">
                {inlineSprintId === sprint.id ? (
                  <form
                    onSubmit={(event) =>
                      void handleInlineSprintTask(event, sprint.id)
                    }
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={inlineTaskTitle}
                      onChange={(event) =>
                        setInlineTaskTitle(event.target.value)
                      }
                      placeholder="Nhập tên task..."
                      className="min-w-0 flex-1 rounded border border-blue-300 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      disabled={isBusy || !inlineTaskTitle.trim()}
                      className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Tạo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineSprintId(null);
                        setInlineTaskTitle("");
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
                      setInlineSprintId(sprint.id);
                      setInlineTaskTitle("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tạo task trong Sprint
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {showCreateSprint && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <form
            onSubmit={(event) => void handleCreateSprint(event)}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-[#172B4D]">
                  {editingSprint ? "Chỉnh sửa Sprint" : "Create sprint"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Tạo Sprint trước, sau đó đưa task từ Backlog vào.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateSprint(false);
                  setEditingSprint(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tên Sprint"
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Sprint goal (không bắt buộc)"
                rows={3}
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-500">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateSprint(false)}
                className="rounded px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isBusy || !name.trim() || !startDate || !endDate}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {editingSprint ? "Lưu thay đổi" : "Tạo Sprint"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
