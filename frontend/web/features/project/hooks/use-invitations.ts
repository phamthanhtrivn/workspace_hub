import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptProjectInvitation,
  cancelProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
  getPendingProjectInvitations,
  resendProjectInvitation,
} from "../api/invitation.api";
import { projectKeys } from "./use-projects";

export const projectInvitationKeys = {
  pending: (projectId: string) =>
    ["projects", projectId, "invitations", "pending"] as const,
};

export function usePendingProjectInvitations(
  projectId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: projectInvitationKeys.pending(projectId),
    queryFn: () => getPendingProjectInvitations(projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export function useCreateProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitedUserId: string) =>
      createProjectInvitation(projectId, invitedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectInvitationKeys.pending(projectId),
      });
    },
  });
}

export function useCancelProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      cancelProjectInvitation(projectId, invitationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectInvitationKeys.pending(projectId),
      }),
  });
}

export function useResendProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      resendProjectInvitation(projectId, invitationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectInvitationKeys.pending(projectId),
      }),
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
