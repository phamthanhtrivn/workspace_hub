import { api } from "@/lib/axios";
import { getUserProfiles } from "./project.api";

export type ProjectInvitationStatus =
  "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  invitedUserId: string;
  invitedBy: string;
  status: ProjectInvitationStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

export interface ProjectInvitationWithUser extends ProjectInvitation {
  invitedUser: {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || "Invitation API request failed");
  }
  return response.data.data;
}

export async function createProjectInvitation(
  projectId: string,
  invitedUserId: string,
): Promise<ProjectInvitation> {
  const response = await api.post<ApiResponse<ProjectInvitation>>(
    `/api/projects/${projectId}/invitations`,
    { invitedUserId },
  );
  return unwrap(response);
}

export async function acceptProjectInvitation(
  invitationId: string,
): Promise<ProjectInvitation> {
  const response = await api.post<ApiResponse<ProjectInvitation>>(
    `/api/project-invitations/${invitationId}/accept`,
  );
  return unwrap(response);
}

export async function declineProjectInvitation(
  invitationId: string,
): Promise<ProjectInvitation> {
  const response = await api.post<ApiResponse<ProjectInvitation>>(
    `/api/project-invitations/${invitationId}/decline`,
  );
  return unwrap(response);
}

export async function getPendingProjectInvitations(
  projectId: string,
): Promise<ProjectInvitationWithUser[]> {
  const response = await api.get<ApiResponse<ProjectInvitation[]>>(
    `/api/projects/${projectId}/invitations`,
  );
  const invitations = unwrap(response) || [];
  const profiles = await getUserProfiles(
    invitations.map((invitation) => invitation.invitedUserId),
  );

  return invitations.map((invitation) => {
    const profile = profiles.get(invitation.invitedUserId);
    return {
      ...invitation,
      invitedUser: {
        id: invitation.invitedUserId,
        ...(profile?.email ? { email: profile.email } : {}),
        ...(profile?.fullName ? { fullName: profile.fullName } : {}),
        ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      },
    };
  });
}

export async function cancelProjectInvitation(
  projectId: string,
  invitationId: string,
): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(
    `/api/projects/${projectId}/invitations/${invitationId}`,
  );
  unwrap(response);
}

export async function resendProjectInvitation(
  projectId: string,
  invitationId: string,
): Promise<ProjectInvitation> {
  const response = await api.post<ApiResponse<ProjectInvitation>>(
    `/api/projects/${projectId}/invitations/${invitationId}/resend`,
  );
  return unwrap(response);
}
