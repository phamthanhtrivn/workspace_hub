import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachLabel, createLabel, deleteLabel, detachLabel, getProjectLabels, updateLabel, type LabelPayload } from "../api/label.api";
import { taskKeys } from "./use-tasks";

export const labelKeys = { project: (projectId: string) => ["projects", projectId, "labels"] as const };

export function useProjectLabels(projectId: string) {
  return useQuery({ queryKey: labelKeys.project(projectId), queryFn: () => getProjectLabels(projectId), enabled: Boolean(projectId) });
}

export function useCreateLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: LabelPayload) => createLabel(projectId, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: labelKeys.project(projectId) }) });
}

export function useUpdateLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ labelId, payload }: { labelId: string; payload: Partial<LabelPayload> }) => updateLabel(labelId, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: labelKeys.project(projectId) }) });
}

export function useDeleteLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (labelId: string) => deleteLabel(labelId), onSuccess: () => queryClient.invalidateQueries({ queryKey: labelKeys.project(projectId) }) });
}

export function useAttachLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) => attachLabel(taskId, labelId), onSuccess: (_, variables) => { void queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }); void queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] }); } });
}

export function useDetachLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) => detachLabel(taskId, labelId), onSuccess: (_, variables) => { void queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) }); void queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] }); } });
}
