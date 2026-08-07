import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTasksToSprint,
  completeSprint,
  createSprint,
  getProjectSprints,
  startSprint,
  updateSprint,
  reopenSprint,
  removeTaskFromSprint,
  type CreateSprintPayload,
  type UpdateSprintPayload,
} from "../api/sprint.api";
import { taskKeys } from "./use-tasks";

export const sprintKeys = {
  project: (projectId: string) => ["projects", projectId, "sprints"] as const,
};

export function useProjectSprints(projectId: string, enabled = true) {
  return useQuery({
    queryKey: sprintKeys.project(projectId),
    queryFn: () => getProjectSprints(projectId),
    enabled: Boolean(projectId) && enabled,
  });
}

function invalidateSprintData(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: sprintKeys.project(projectId) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
}

export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSprintPayload) => createSprint(projectId, payload),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useAddTasksToSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, taskIds }: { sprintId: string; taskIds: string[] }) => addTasksToSprint(sprintId, taskIds),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useRemoveTaskFromSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) => removeTaskFromSprint(sprintId, taskId),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => startSprint(sprintId),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useUpdateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, payload }: { sprintId: string; payload: UpdateSprintPayload }) => updateSprint(sprintId, payload),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useCompleteSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => completeSprint(sprintId),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}

export function useReopenSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => reopenSprint(sprintId),
    onSuccess: () => invalidateSprintData(queryClient, projectId),
  });
}
