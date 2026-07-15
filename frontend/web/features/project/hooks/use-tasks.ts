import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  getProjectTasks,
  updateTask,
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
