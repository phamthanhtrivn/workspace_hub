import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  removeProjectMember,
  updateProjectMemberPermissions,
} from "../api/member.api";
import type { ProjectMemberPermissions } from "../types/project";
import { projectKeys } from "./use-projects";

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberUserId: string) =>
      removeProjectMember(projectId, memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    },
  });
}

export function useUpdateProjectMemberPermissions(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberUserId,
      permissions,
    }: {
      memberUserId: string;
      permissions: ProjectMemberPermissions;
    }) => updateProjectMemberPermissions(projectId, memberUserId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    },
  });
}
