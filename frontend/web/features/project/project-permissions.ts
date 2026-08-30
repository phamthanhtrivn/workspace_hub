import {
  ProjectRole,
  type Project,
  type ProjectMember,
  type Task,
} from "./types/project";

export interface ProjectPermissions {
  role?: ProjectRole;
  canManageProject: boolean;
  canManagePermissions: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canManageSprints: boolean;
  canManageLabels: boolean;
  canCreateTask: boolean;
  canEditTask: (task: Pick<Task, "createdBy">) => boolean;
}

export const NO_PROJECT_PERMISSIONS: ProjectPermissions = {
  canManageProject: false,
  canManagePermissions: false,
  canInviteMembers: false,
  canManageMembers: false,
  canManageSprints: false,
  canManageLabels: false,
  canCreateTask: false,
  canEditTask: () => false,
};

export function getProjectPermissions(
  project: Project,
  members: ProjectMember[],
  currentUserId?: string | null,
): ProjectPermissions {
  const membership = members.find((member) => member.userId === currentUserId);
  const role =
    project.ownerId === currentUserId ? ProjectRole.OWNER : membership?.role;
  const canManageProject = role === ProjectRole.OWNER;
  const isMember = Boolean(role);

  return {
    role,
    canManageProject,
    canManagePermissions: canManageProject,
    canInviteMembers: canManageProject || Boolean(membership?.canManageMembers),
    canManageMembers: canManageProject || Boolean(membership?.canManageMembers),
    canManageSprints: canManageProject || Boolean(membership?.canManageSprints),
    canManageLabels: canManageProject || Boolean(membership?.canManageLabels),
    canCreateTask: canManageProject || Boolean(membership?.canCreateTask),
    canEditTask: (task) => {
      if (canManageProject) return true;
      if (!isMember || !currentUserId) return false;
      return task.createdBy === currentUserId
        ? Boolean(membership?.canEditOwnTask)
        : Boolean(membership?.canEditOthersTask);
    },
  };
}
