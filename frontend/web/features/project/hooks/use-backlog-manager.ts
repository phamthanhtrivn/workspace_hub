"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjectFiles } from "@/features/project/hooks/use-project-files";
import { downloadProjectFile, type ProjectFile } from "@/features/project/api/project-file.api";
import {
  SprintStatus,
  TaskStatus,
  isTerminalTaskStatus,
  type Sprint,
  type Task,
} from "@/features/project/types/project";
import type { SprintCreateValues } from "@/features/project/components/views/software-backlog-view";

interface UseBacklogManagerOptions {
  projectId: string;
  tasks: Task[];
  sprints: Sprint[];
  canContribute?: boolean;
  canEditTask?: (task: Task) => boolean;
  onCreateSprint: (values: SprintCreateValues) => Promise<void>;
  onUpdateSprint: (sprintId: string, values: SprintCreateValues) => Promise<void>;
  onAddTasksToSprint: (sprintId: string, taskIds: string[]) => Promise<void>;
  onBulkUpdateTasks?: (taskIds: string[], status: TaskStatus) => Promise<void>;
  onRemoveTaskFromSprint?: (sprintId: string, taskId: string) => Promise<void>;
}

export function useBacklogManager({
  projectId,
  tasks,
  sprints = [],
  canContribute = false,
  canEditTask = () => false,
  onCreateSprint,
  onUpdateSprint,
  onAddTasksToSprint,
  onBulkUpdateTasks,
  onRemoveTaskFromSprint,
}: UseBacklogManagerOptions) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>(TaskStatus.IN_PROGRESS);
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

  const activeTasks = useMemo(() => tasks.filter((task) => !task.archived), [tasks]);

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

  const backlogTasks = useMemo(
    () => activeTasks.filter((task) => !task.sprintId && !task.parentTaskId),
    [activeTasks],
  );

  const plannedSprints = useMemo(
    () => sprints.filter((sprint) => sprint.status === SprintStatus.PLANNED),
    [sprints],
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

  return {
    selectedTaskIds,
    targetSprintId,
    setTargetSprintId,
    bulkStatus,
    setBulkStatus,
    showCreateSprint,
    setShowCreateSprint,
    editingSprint,
    dragOverTarget,
    setDragOverTarget,
    fileQuery,
    filesBusy,
    addFiles,
    removeFile,
    downloadFile,
    activeTasks,
    childrenByParent,
    backlogTasks,
    plannedSprints,
    toggleTask,
    handleAddTasks,
    handleBulkStatus,
    handleSprintSubmit,
    openCreateSprint,
    openEditSprint,
    handleDragStart,
    handleSprintDragOver,
    handleDropOnSprint,
    handleDropOnBacklog,
  };
}
