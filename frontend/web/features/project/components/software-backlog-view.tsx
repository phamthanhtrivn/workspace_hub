"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useProjectFiles } from "../hooks/use-project-files";
import { downloadProjectFile, type ProjectFile } from "../api/project-file.api";
import {
  SprintStatus,
  TaskStatus,
  isTerminalTaskStatus,
  type Sprint,
  type Task,
} from "@/features/project/types/project";
import { TaskStatusBadge } from "./status-badge";
import TaskChatButton from "./task-chat-button";
import { getIssueKey } from "./task-card";
import ProjectFilePanel from "./project-file-panel";
import BacklogBulkActionBar from "./backlog-bulk-action-bar";
import { SprintCard } from "./sprint-card";
import { SprintFormModal } from "./sprint-form-modal";

export interface SprintCreateValues {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

export default function SoftwareBacklogView({
  projectId,
  currentUserId,
  ownerId,
  canContribute = false,
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
  canCreateTask = false,
  canManageSprints = false,
  canEditTask = () => false,
}: {
  projectId: string;
  currentUserId?: string | null;
  ownerId: string;
  canContribute?: boolean;
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
  canCreateTask?: boolean;
  canManageSprints?: boolean;
  canEditTask?: (task: Task) => boolean;
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>(
    TaskStatus.IN_PROGRESS,
  );
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const fileQuery = useProjectFiles(projectId);
  const [filesBusy, setFilesBusy] = useState(false);

  const addFiles = async (files: FileList | File[], sprintId?: string) => {
    if (filesBusy || !canContribute) return;
    setFilesBusy(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray)
        await fileQuery.upload.mutateAsync({ file, sprintId });
      toast.success("Đã lưu tệp đính kèm");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tải tệp lên",
      );
    } finally {
      setFilesBusy(false);
    }
  };

  const removeFile = async (file: ProjectFile) => {
    try {
      await fileQuery.remove.mutateAsync(file.id);
    } catch {
      toast.error("Không thể xóa tệp");
    }
  };

  const downloadFile = async (file: ProjectFile) => {
    try {
      await downloadProjectFile(projectId, file);
    } catch {
      toast.error("Không thể tải tệp");
    }
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

  const handleSprintSubmit = async (values: SprintCreateValues) => {
    if (editingSprint) {
      await onUpdateSprint(editingSprint.id, values);
    } else {
      await onCreateSprint(values);
    }
    setEditingSprint(null);
    setShowCreateSprint(false);
  };

  const openCreateSprint = () => {
    setEditingSprint(null);
    setShowCreateSprint(true);
  };

  const openEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setShowCreateSprint(true);
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

  const handleSprintDragOver = (event: React.DragEvent, sprint: Sprint) => {
    if (sprint.status === SprintStatus.PLANNED) {
      event.preventDefault();
      setDragOverTarget(sprint.id);
    }
  };

  const handleDropOnSprint = async (event: React.DragEvent, sprint: Sprint) => {
    event.preventDefault();
    setDragOverTarget(null);
    if (sprint.status !== SprintStatus.PLANNED || !onAddTasksToSprint) return;
    const payload = readDragPayload(event);
    if (!payload || payload.sprintId === sprint.id) return;
    const task = activeTasks.find((item) => item.id === payload.taskId);
    if (!task || !canEditTask(task) || isTerminalTaskStatus(task.status))
      return;
    await onAddTasksToSprint(sprint.id, [payload.taskId]);
  };

  const handleDropOnBacklog = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverTarget(null);
    const payload = readDragPayload(event);
    if (!payload?.sprintId || !onRemoveTaskFromSprint) return;
    const task = activeTasks.find((item) => item.id === payload.taskId);
    if (!task || !canEditTask(task) || isTerminalTaskStatus(task.status))
      return;
    await onRemoveTaskFromSprint(payload.sprintId, payload.taskId);
  };

  return (
    <div className="space-y-5">
      <ProjectFilePanel
        files={fileQuery.data ?? []}
        isLoading={fileQuery.isLoading}
        isError={fileQuery.isError}
        busy={filesBusy || fileQuery.remove.isPending}
        canUpload={canContribute}
        canRemove={(file) =>
          canContribute &&
          (currentUserId === ownerId || currentUserId === file.uploadedBy)
        }
        onDownload={(file) => void downloadFile(file)}
        onRetry={() => void fileQuery.refetch()}
        sprintName={(id) =>
          sprints.find((sprint) => sprint.id === id)?.name ?? "Sprint"
        }
        onAddFiles={(files) => void addFiles(files)}
        onRemoveFile={removeFile}
      />

      <section
        className={`overflow-hidden rounded border bg-white shadow-sm transition ${
          dragOverTarget === "backlog"
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-slate-200"
        }`}
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
            {canCreateTask && (
              <button
                type="button"
                onClick={() => onCreateTask?.()}
                className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo task
              </button>
            )}
            {canManageSprints && (
              <button
                type="button"
                onClick={openCreateSprint}
                className="inline-flex items-center gap-1.5 rounded bg-[#0052CC] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0747A6]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create sprint
              </button>
            )}
          </div>
        </div>

        <BacklogBulkActionBar
          selectedCount={selectedTaskIds.length}
          plannedSprints={plannedSprints}
          targetSprintId={targetSprintId}
          onTargetSprintChange={setTargetSprintId}
          onAddTasksToSprint={handleAddTasks}
          bulkStatus={bulkStatus}
          onBulkStatusChange={setBulkStatus}
          onApplyBulkStatus={handleBulkStatus}
          isBusy={isBusy}
        />

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
                      disabled={
                        isTerminalTaskStatus(task.status) || !canEditTask(task)
                      }
                      className="h-4 w-4 accent-[#0052CC] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Chọn ${task.title}`}
                    />
                    <button
                      type="button"
                      draggable={
                        canEditTask(task) && !isTerminalTaskStatus(task.status)
                      }
                      onDragStart={(event) => {
                        if (
                          canEditTask(task) &&
                          !isTerminalTaskStatus(task.status)
                        ) {
                          handleDragStart(event, task.id);
                        }
                      }}
                      onClick={() => onTaskClick?.(task)}
                      className={`min-w-0 flex-1 text-left ${
                        canEditTask(task) && !isTerminalTaskStatus(task.status)
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-pointer"
                      }`}
                    >
                      <span className="block truncate text-xs font-bold text-[#172B4D]">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                        {getIssueKey(task)}
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
        {sprints.map((sprint) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            dragOverTarget={dragOverTarget}
            onDragOver={handleSprintDragOver}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={handleDropOnSprint}
            onDragStart={handleDragStart}
            canContribute={canContribute}
            canManageSprints={canManageSprints}
            canCreateTask={canCreateTask}
            canEditTask={canEditTask}
            filesBusy={filesBusy}
            isBusy={isBusy}
            onAddFiles={addFiles}
            onEditSprint={openEditSprint}
            onStartSprint={onStartSprint}
            onCompleteSprint={onCompleteSprint}
            onReopenSprint={onReopenSprint}
            onTaskClick={onTaskClick}
            onOpenChat={onOpenChat}
            onCreateSprintTask={onCreateSprintTask}
          />
        ))}
      </div>

      <SprintFormModal
        isOpen={showCreateSprint}
        editingSprint={editingSprint}
        onClose={() => {
          setShowCreateSprint(false);
          setEditingSprint(null);
        }}
        onSubmit={handleSprintSubmit}
        isBusy={isBusy}
      />
    </div>
  );
}
