import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  getProjectTaskStatusCounts,
  getProjectTasks,
  updateTask,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  getTaskActivities,
  type CreateTaskPayload,
  type ProjectTaskStatusCounts,
  type UpdateTaskPayload,
} from "../api/task.api";
import type { ProjectTaskQuery } from "../project-task-view";

export const taskKeys = {
  project: (projectId: string, query?: ProjectTaskQuery) =>
    query && Object.keys(query).length > 0
      ? (["projects", projectId, "tasks", query] as const)
      : (["projects", projectId, "tasks"] as const),
  statusCounts: (projectId: string) =>
    ["projects", projectId, "task-status-counts"] as const,
  detail: (taskId: string) => ["tasks", taskId] as const,
};

export function useProjectTasks(
  projectId: string,
  query?: ProjectTaskQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: taskKeys.project(projectId, query),
    queryFn: () => getProjectTasks(projectId, query),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useProjectTaskStatusCounts(projectId: string) {
  return useQuery<ProjectTaskStatusCounts>({
    queryKey: taskKeys.statusCounts(projectId),
    queryFn: () => getProjectTaskStatusCounts(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: taskKeys.statusCounts(projectId) });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: taskKeys.statusCounts(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });
}

export function useCreateChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) => createChecklist(taskId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId] }),
  });
}

export function useUpdateChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checklistId, completed }: { checklistId: string; completed: boolean }) => updateChecklist(checklistId, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId] }),
  });
}

export function useDeleteChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checklistId: string) => deleteChecklist(checklistId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId] }),
  });
}

export function useTaskActivities(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "activities"],
    queryFn: () => getTaskActivities(taskId),
    enabled: Boolean(taskId),
  });
}
