import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  getProjectTasks,
  updateTask,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  getTaskActivities,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from "../api/task.api";

export const taskKeys = {
  project: (projectId: string) => ["projects", projectId, "tasks"] as const,
  detail: (taskId: string) => ["tasks", taskId] as const,
};

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.project(projectId),
    queryFn: () => getProjectTasks(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
  });
}

export function useCreateChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) => createChecklist(taskId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }),
  });
}

export function useUpdateChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checklistId, completed }: { checklistId: string; completed: boolean }) => updateChecklist(checklistId, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }),
  });
}

export function useDeleteChecklist(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checklistId: string) => deleteChecklist(checklistId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }),
  });
}

export function useTaskActivities(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "activities"],
    queryFn: () => getTaskActivities(taskId),
    enabled: Boolean(taskId),
  });
}
