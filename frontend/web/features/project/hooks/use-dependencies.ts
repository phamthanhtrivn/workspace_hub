import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTaskDependency,
  deleteTaskDependency,
  getProjectDependencies,
} from "../api/dependency.api";
import { invalidateProjectChange } from "../api/project-invalidation";

export const dependencyKeys = {
  project: (projectId: string) =>
    ["projects", projectId, "dependencies"] as const,
};

export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: dependencyKeys.project(projectId),
    queryFn: () => getProjectDependencies(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateTaskDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      successorTaskId,
      predecessorTaskId,
    }: {
      successorTaskId: string;
      predecessorTaskId: string;
    }) => createTaskDependency(successorTaskId, predecessorTaskId),
    onSuccess: (_, variables) => invalidateProjectChange(queryClient, { projectId, resource: 'DEPENDENCY', taskIds: [variables.successorTaskId, variables.predecessorTaskId] }),
  });
}

export function useDeleteTaskDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      successorTaskId,
      predecessorTaskId,
    }: {
      successorTaskId: string;
      predecessorTaskId: string;
    }) => deleteTaskDependency(successorTaskId, predecessorTaskId),
    onSuccess: (_, variables) => invalidateProjectChange(queryClient, { projectId, resource: 'DEPENDENCY', taskIds: [variables.successorTaskId, variables.predecessorTaskId] }),
  });
}
