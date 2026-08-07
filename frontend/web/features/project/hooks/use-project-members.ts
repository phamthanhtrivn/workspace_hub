import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeProjectMember } from "../api/invitation.api";
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
