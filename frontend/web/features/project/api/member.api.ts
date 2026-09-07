import { api } from "@/lib/axios";
import type { ProjectMemberPermissions } from "../types/project";

export async function removeProjectMember(
  projectId: string,
  memberUserId: string,
): Promise<void> {
  await api.delete(`/api/projects/${projectId}/members/${memberUserId}`);
}

export async function updateProjectMemberPermissions(
  projectId: string,
  memberUserId: string,
  permissions: ProjectMemberPermissions,
): Promise<void> {
  await api.patch(
    `/api/projects/${projectId}/members/${memberUserId}`,
    permissions,
  );
}
