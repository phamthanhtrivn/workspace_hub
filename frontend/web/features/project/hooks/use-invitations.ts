import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceptProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
} from "../api/invitation.api";
import { projectKeys } from "./use-projects";

export function useCreateProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitedUserId: string) =>
      createProjectInvitation(projectId, invitedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(projectId),
      });
    },
  });
}

export function useRespondProjectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invitationId,
      action,
    }: {
      invitationId: string;
      action: "accept" | "decline";
    }) =>
      action === "accept"
        ? acceptProjectInvitation(invitationId)
        : declineProjectInvitation(invitationId),
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(invitation.projectId),
      });
    },
  });
}
