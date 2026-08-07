import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTaskDependency, deleteTaskDependency, getProjectDependencies } from "../api/dependency.api";

export const dependencyKeys = { project: (projectId: string) => ["projects", projectId, "dependencies"] as const };

export function useProjectDependencies(projectId: string) {
  return useQuery({ queryKey: dependencyKeys.project(projectId), queryFn: () => getProjectDependencies(projectId), enabled: Boolean(projectId) });
}

export function useCreateTaskDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ successorTaskId, predecessorTaskId }: { successorTaskId: string; predecessorTaskId: string }) => createTaskDependency(successorTaskId, predecessorTaskId), onSuccess: () => queryClient.invalidateQueries({ queryKey: dependencyKeys.project(projectId) }) });
}

export function useDeleteTaskDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ successorTaskId, predecessorTaskId }: { successorTaskId: string; predecessorTaskId: string }) => deleteTaskDependency(successorTaskId, predecessorTaskId), onSuccess: () => queryClient.invalidateQueries({ queryKey: dependencyKeys.project(projectId) }) });
}
