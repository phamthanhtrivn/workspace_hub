import { api } from "@/lib/axios";

export type ProjectInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

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

export async function getPendingProjectInvitations(): Promise<ProjectInvitation[]> {
  const response = await api.get<ApiResponse<ProjectInvitation[]>>(
    "/api/project-invitations/pending",
  );
  return unwrap(response) || [];
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

export async function removeProjectMember(
  projectId: string,
  memberUserId: string,
): Promise<void> {
  await api.delete(`/api/projects/${projectId}/members/${memberUserId}`);
}
