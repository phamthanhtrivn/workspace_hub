"use client";

import { useCallback } from "react";
import { toast } from "react-toastify";
import type { Dispatch, SetStateAction } from "react";
import type { Task } from "@/features/project/types/project";
import { TaskStatus } from "@/features/project/types/project";
import type { SprintCreateValues } from "@/features/project/components/sprint/software-backlog-view";
import type { SprintFormValues } from "@/features/project/components/sprint/sprint-edit-dialog";

type MutationLike = {
  mutateAsync: (payload: never) => Promise<unknown>;
};

function runMutation(mutation: MutationLike, payload: unknown): Promise<unknown> {
  return mutation.mutateAsync(payload as never);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getBackendErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return getErrorMessage(error, fallback);
}

interface UseProjectSprintActionsOptions {
  tasks: Task[];
  isSoftwareProject: boolean;
  editingSprint: Task | null;
  createTaskMutation: MutationLike;
  updateTaskMutation: MutationLike;
  addTasksToSprintMutation: MutationLike;
  createSprintMutation: MutationLike;
  updateSprintMutation: MutationLike;
  startSprintMutation: MutationLike;
  completeSprintMutation: MutationLike;
  reopenSprintMutation: MutationLike;
  removeTaskFromSprintMutation: MutationLike;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setEditingSprint: Dispatch<SetStateAction<Task | null>>;
  setEditingTask: Dispatch<SetStateAction<Task | null>>;
  setShowTaskForm: Dispatch<SetStateAction<boolean>>;
  setNewTaskStatus: Dispatch<SetStateAction<TaskStatus>>;
  setNewTaskStartDate: Dispatch<SetStateAction<string | undefined>>;
  setNewTaskAllDay: Dispatch<SetStateAction<boolean>>;
  setNewTaskParentId: Dispatch<SetStateAction<string | undefined>>;
  setNewTaskSprintId: Dispatch<SetStateAction<string | undefined>>;
  setNewTaskIsParentTask: Dispatch<SetStateAction<boolean>>;
}

export function useProjectSprintActions({
  tasks,
  isSoftwareProject,
  editingSprint,
  createTaskMutation,
  updateTaskMutation,
  addTasksToSprintMutation,
  createSprintMutation,
  updateSprintMutation,
  startSprintMutation,
  completeSprintMutation,
  reopenSprintMutation,
  removeTaskFromSprintMutation,
  setSelectedTask,
  setEditingSprint,
  setEditingTask,
  setShowTaskForm,
  setNewTaskStatus,
  setNewTaskStartDate,
  setNewTaskAllDay,
  setNewTaskParentId,
  setNewTaskSprintId,
  setNewTaskIsParentTask,
}: UseProjectSprintActionsOptions) {
  const handleEditGroup = useCallback((group: Task) => {
    setSelectedTask(null);
    setEditingSprint(group);
  }, [setEditingSprint, setSelectedTask]);

  const handleSprintSubmit = useCallback(async (values: SprintFormValues) => {
    if (!editingSprint) return;

    try {
      await runMutation(updateTaskMutation, {
        taskId: editingSprint.id,
        payload: {
          title: values.name,
          startDate: values.startDate,
          dueDate: values.endDate,
          description: values.goal,
          allDay: false,
          autoCompleteSprint: values.autoCompleteSprint,
        },
      });
      setEditingSprint(null);
      toast.success("Cập nhật sprint thành công");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật sprint"));
    }
  }, [editingSprint, setEditingSprint, updateTaskMutation]);

  const handleDeleteGroup = useCallback(async (group: Task) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Xóa nhóm "${group.title}"? Các task bên trong sẽ được chuyển về Backlog.`,
      )
    ) {
      return;
    }

    try {
      const children = tasks.filter((task) => task.parentTaskId === group.id);
      await Promise.all(
        children.map((task) =>
          runMutation(updateTaskMutation, {
            taskId: task.id,
            payload: { clearParent: true },
          }),
        ),
      );
      await runMutation(updateTaskMutation, {
        taskId: group.id,
        payload: { archived: true, isParentTask: false },
      });
      setSelectedTask(null);
      toast.success("Đã xóa sprint và chuyển task về Backlog");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa sprint"));
    }
  }, [setSelectedTask, tasks, updateTaskMutation]);

  const handleReorderTasks = useCallback(async (group: Task, orderedTasks: Task[]) => {
    try {
      await Promise.all(
        orderedTasks.map((task, index) =>
          runMutation(updateTaskMutation, {
            taskId: task.id,
            payload: { rank: String((index + 1) * 1000) },
          }),
        ),
      );
      toast.success(`Đã sắp xếp lại work items trong "${group.title}"`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể sắp xếp work items"));
    }
  }, [updateTaskMutation]);

  const handleCreateTaskInline = useCallback(async (
    title: string,
    parentTaskId?: string,
    isParentTask = false,
  ) => {
    try {
      await runMutation(createTaskMutation, {
        title: title.trim(),
        ...(parentTaskId ? { parentTaskId } : {}),
        ...(isParentTask ? { isParentTask: true } : {}),
      });
      toast.success("Tạo công việc thành công");
    } catch (error: unknown) {
      toast.error(getBackendErrorMessage(error, "Không thể tạo công việc"));
      console.error("Create task error:", error);
    }
  }, [createTaskMutation]);

  const handleCreateSprintTask = useCallback(async (sprintId: string, title: string) => {
    try {
      const createdTask = await runMutation(createTaskMutation, {
        title,
        status: TaskStatus.TODO,
      }) as Task;
      await runMutation(addTasksToSprintMutation, {
        sprintId,
        taskIds: [createdTask.id],
      });
      toast.success("Tạo task trong Sprint thành công");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tạo task trong Sprint"));
      throw error;
    }
  }, [addTasksToSprintMutation, createTaskMutation]);

  const openCreateTask = useCallback((
    status: TaskStatus = TaskStatus.TODO,
    startDate?: string,
    allDay = false,
    parentTaskId?: string,
    sprintId?: string,
  ) => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setNewTaskStartDate(startDate);
    setNewTaskAllDay(allDay);
    setNewTaskParentId(parentTaskId);
    setNewTaskSprintId(sprintId);
    setNewTaskIsParentTask(!isSoftwareProject && !parentTaskId);
    setShowTaskForm(true);
  }, [isSoftwareProject, setEditingTask, setNewTaskAllDay, setNewTaskIsParentTask, setNewTaskParentId, setNewTaskSprintId, setNewTaskStartDate, setNewTaskStatus, setShowTaskForm]);

  const handleCreateSprint = useCallback(async (values: SprintCreateValues) => {
    try {
      await runMutation(createSprintMutation, values);
      toast.success("Tạo Sprint thành công");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tạo Sprint"));
      throw error;
    }
  }, [createSprintMutation]);

  const handleAddTasksToSprint = useCallback(async (sprintId: string, taskIds: string[]) => {
    try {
      await runMutation(addTasksToSprintMutation, { sprintId, taskIds });
      toast.success("Đã đưa task vào Sprint");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đưa task vào Sprint"));
      throw error;
    }
  }, [addTasksToSprintMutation]);

  const handleBulkUpdateTasks = useCallback(async (taskIds: string[], status: TaskStatus) => {
    try {
      await Promise.all(
        taskIds.map((taskId) =>
          runMutation(updateTaskMutation, { taskId, payload: { status } }),
        ),
      );
      toast.success(`Đã cập nhật ${taskIds.length} task`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật hàng loạt task"));
      throw error;
    }
  }, [updateTaskMutation]);

  const handleUpdateSprint = useCallback(async (
    sprintId: string,
    values: SprintCreateValues,
  ) => {
    try {
      await runMutation(updateSprintMutation, { sprintId, payload: values });
      toast.success("Đã cập nhật Sprint");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật Sprint"));
      throw error;
    }
  }, [updateSprintMutation]);

  const handleStartSprint = useCallback(async (sprintId: string) => {
    try {
      await runMutation(startSprintMutation, sprintId);
      toast.success("Đã Start Sprint");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể Start Sprint"));
    }
  }, [startSprintMutation]);

  const handleCompleteSprint = useCallback(async (sprintId: string) => {
    try {
      await runMutation(completeSprintMutation, sprintId);
      toast.success("Đã Complete Sprint; task chưa xong quay lại Backlog");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể Complete Sprint"));
    }
  }, [completeSprintMutation]);

  const handleReopenSprint = useCallback(async (sprintId: string) => {
    try {
      await runMutation(reopenSprintMutation, sprintId);
      toast.success("Đã mở lại Sprint ở trạng thái Planned");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể mở lại Sprint"));
    }
  }, [reopenSprintMutation]);

  const handleRemoveTaskFromSprint = useCallback(async (sprintId: string, taskId: string) => {
    try {
      await runMutation(removeTaskFromSprintMutation, { sprintId, taskId });
      toast.success("Đã đưa task về Backlog");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đưa task về Backlog"));
      throw error;
    }
  }, [removeTaskFromSprintMutation]);

  return {
    handleEditGroup,
    handleSprintSubmit,
    handleDeleteGroup,
    handleReorderTasks,
    handleCreateTaskInline,
    handleCreateSprintTask,
    openCreateTask,
    handleCreateSprint,
    handleAddTasksToSprint,
    handleBulkUpdateTasks,
    handleUpdateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleReopenSprint,
    handleRemoveTaskFromSprint,
  };
}
