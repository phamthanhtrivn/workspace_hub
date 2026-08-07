"use client";

import { useCallback } from "react";
import { toast } from "react-toastify";
import type { QueryClient } from "@tanstack/react-query";
import type { UpdateTaskPayload } from "@/features/project/api/task.api";
import { taskKeys } from "@/features/project/hooks/use-tasks";
import type { Task, TaskAssignee, TaskChecklist, ProjectMember } from "@/features/project/types/project";
import type { TaskFormValues } from "@/features/project/components/task-form-dialog";
import type { TaskDrawerUpdatePayload } from "@/features/project/components/project-task-overlays";

type MutationLike = {
  mutateAsync: (payload: never) => Promise<unknown>;
};

function runMutation(mutation: MutationLike, payload: unknown): Promise<unknown> {
  return mutation.mutateAsync(payload as never);
}

interface UseProjectTaskActionsOptions {
  projectId: string;
  members: ProjectMember[];
  editingTask: Task | null;
  newTaskSprintId?: string;
  queryClient: QueryClient;
  createTaskMutation: MutationLike;
  updateTaskMutation: MutationLike;
  addTasksToSprintMutation: MutationLike;
  createChecklistMutation: MutationLike;
  updateChecklistMutation: MutationLike;
  deleteChecklistMutation: MutationLike;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  setShowTaskForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
}

export function useProjectTaskActions({
  projectId,
  members,
  editingTask,
  newTaskSprintId,
  queryClient,
  createTaskMutation,
  updateTaskMutation,
  addTasksToSprintMutation,
  createChecklistMutation,
  updateChecklistMutation,
  deleteChecklistMutation,
  setSelectedTask,
  setShowTaskForm,
  setEditingTask,
}: UseProjectTaskActionsOptions) {
  const handleTaskSubmit = useCallback(async (values: TaskFormValues) => {
    try {
      if (editingTask) {
        const payload = editingTask.parentTaskId && !values.parentTaskId
          ? { ...values, clearParent: true }
          : values;
        await runMutation(updateTaskMutation, { taskId: editingTask.id, payload });
        toast.success("Cập nhật task thành công");
      } else {
        const createdTask = await runMutation(createTaskMutation, { ...values }) as Task;
        if (newTaskSprintId) {
          await runMutation(addTasksToSprintMutation, { sprintId: newTaskSprintId, taskIds: [createdTask.id] });
        }
        toast.success("Tạo task thành công");
      }

      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu task");
    }
  }, [addTasksToSprintMutation, createTaskMutation, editingTask, newTaskSprintId, setEditingTask, setShowTaskForm, updateTaskMutation]);

  const handleUpdateTaskDirect = useCallback(async (taskId: string, payload: TaskDrawerUpdatePayload) => {
    try {
      const backendKeys: string[] = [
        "title", "description", "status", "priority", "startDate", "dueDate",
        "allDay", "estimatedMinutes", "assigneeUserId",
      ];
      const backendPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => backendKeys.includes(key)),
      ) as UpdateTaskPayload;

      if (Object.keys(backendPayload).length > 0) {
        await runMutation(updateTaskMutation, { taskId, payload: backendPayload });
      }

      const resolveAssignees = (current: Task["assignees"]): TaskAssignee[] => {
        if (payload.assignees) return payload.assignees;
        if (!("assigneeUserId" in payload)) return current;
        if (!payload.assigneeUserId) return [];
        const member = members.find((item) => item.userId === payload.assigneeUserId);
        return member ? [{
          id: `ta-${Date.now()}`,
          taskId,
          userId: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          assignedAt: new Date().toISOString(),
        }] : [];
      };

      queryClient.setQueryData(taskKeys.project(projectId), (oldTasks: Task[] | undefined) =>
        oldTasks?.map((task) => task.id === taskId
          ? { ...task, ...payload, assignees: resolveAssignees(task.assignees) }
          : task),
      );
      setSelectedTask((current) => current && current.id === taskId
        ? { ...current, ...payload, assignees: resolveAssignees(current.assignees) } as Task
        : current,
      );
    } catch (error: unknown) {
      const response = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response
        : undefined;
      const message = response?.data?.message || "Không thể cập nhật công việc";
      toast.error(message);
      console.error("Update task error:", response?.data || error);
    }
  }, [members, projectId, queryClient, setSelectedTask, updateTaskMutation]);

  const handleCreateChecklist = useCallback(async (taskId: string, title: string): Promise<TaskChecklist> => {
    const item = await runMutation(createChecklistMutation, { taskId, title }) as TaskChecklist;
    setSelectedTask((current) => current?.id === taskId
      ? { ...current, checklists: [...current.checklists, item] }
      : current,
    );
    return item;
  }, [createChecklistMutation, setSelectedTask]);

  const handleUpdateChecklist = useCallback(async (checklistId: string, completed: boolean): Promise<TaskChecklist> => {
    const item = await runMutation(updateChecklistMutation, { checklistId, completed }) as TaskChecklist;
    setSelectedTask((current) => current ? {
      ...current,
      checklists: current.checklists.map((checklist) => checklist.id === checklistId ? item : checklist),
    } : current);
    return item;
  }, [setSelectedTask, updateChecklistMutation]);

  const handleDeleteChecklist = useCallback(async (checklistId: string): Promise<void> => {
    await runMutation(deleteChecklistMutation, checklistId);
    setSelectedTask((current) => current ? {
      ...current,
      checklists: current.checklists.filter((checklist) => checklist.id !== checklistId),
    } : current);
  }, [deleteChecklistMutation, setSelectedTask]);

  return {
    handleTaskSubmit,
    handleUpdateTaskDirect,
    handleCreateChecklist,
    handleUpdateChecklist,
    handleDeleteChecklist,
  };
}
