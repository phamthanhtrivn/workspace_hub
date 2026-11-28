import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  removeProjectMember,
  updateProjectMemberPermissions,
} from "../api/member.api";
import type { ProjectMemberPermissions } from "../types/project";
import { invalidateProjectChange } from "../api/project-invalidation";

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberUserId: string) =>
      removeProjectMember(projectId, memberUserId),
    onSuccess: () => invalidateProjectChange(queryClient, { projectId, resource: 'MEMBER', action: 'DELETED' }),
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
    onSuccess: () => invalidateProjectChange(queryClient, { projectId, resource: 'MEMBER', action: 'UPDATED' }),
  });
}
