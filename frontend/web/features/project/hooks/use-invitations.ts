import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
  getPendingProjectInvitations,
} from "../api/invitation.api";
import { projectKeys } from "./use-projects";

export const invitationKeys = {
  pending: ["project-invitations", "pending"] as const,
};

export function usePendingProjectInvitations() {
  return useQuery({
    queryKey: invitationKeys.pending,
    queryFn: getPendingProjectInvitations,
  });
}

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
      queryClient.invalidateQueries({ queryKey: invitationKeys.pending });
      queryClient.invalidateQueries({
        queryKey: projectKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(invitation.projectId),
      });
    },
  });
}
