import {
  ProjectRole,
  type Project,
  type ProjectMember,
  type Task,
} from "./types/project";

export interface ProjectPermissions {
  role?: ProjectRole;
  canManageProject: boolean;
  canInviteMembers: boolean;
  canCreateTask: boolean;
  canEditTask: (task: Pick<Task, "createdBy">) => boolean;
}

export const NO_PROJECT_PERMISSIONS: ProjectPermissions = {
  canManageProject: false,
  canInviteMembers: false,
  canCreateTask: false,
  canEditTask: () => false,
};

export function getProjectPermissions(
  project: Project,
  members: ProjectMember[],
  currentUserId?: string | null,
): ProjectPermissions {
  const membership = members.find(
    (member) => member.userId === currentUserId,
  );
  const role =
    project.ownerId === currentUserId ? ProjectRole.OWNER : membership?.role;
  const canManageProject =
    role === ProjectRole.OWNER || role === ProjectRole.ADMIN;
  const isMember = Boolean(role);

  return {
    role,
    canManageProject,
    canInviteMembers:
      canManageProject ||
      (isMember && project.projectSetting.allowMemberInvite),
    canCreateTask:
      canManageProject ||
      (isMember && project.projectSetting.allowMemberCreateTask),
    canEditTask: (task) => {
      if (canManageProject) return true;
      if (!isMember || !currentUserId) return false;
      return task.createdBy === currentUserId
        ? project.projectSetting.allowMemberEditOwnTask
        : project.projectSetting.allowMemberEditOthersTask;
    },
  };
}
