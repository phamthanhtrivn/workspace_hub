import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptProjectInvitation,
  cancelProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
  getPendingProjectInvitations,
  resendProjectInvitation,
} from "../api/invitation.api";
import { invalidateProjectChange } from "../api/project-invalidation";

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
    onSuccess: () => invalidateProjectChange(queryClient, { projectId, resource: 'INVITATION', action: 'CREATED' }),
  });
}

export function useCancelProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      cancelProjectInvitation(projectId, invitationId),
    onSuccess: () => invalidateProjectChange(queryClient, { projectId, resource: 'INVITATION', action: 'DELETED' }),
  });
}

export function useResendProjectInvitation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      resendProjectInvitation(projectId, invitationId),
    onSuccess: () => invalidateProjectChange(queryClient, { projectId, resource: 'INVITATION', action: 'CREATED' }),
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
    onSuccess: (invitation) => invalidateProjectChange(queryClient, { projectId: invitation.projectId, resource: 'INVITATION', action: 'UPDATED', data: invitation }),
  });
}
