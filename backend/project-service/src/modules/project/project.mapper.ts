import {
  Prisma,
  Project,
  ProjectInvitation,
  ProjectMember,
  ProjectSetting,
  Task,
  TaskActivity,
  TaskAssignee,
  TaskComment,
} from "@prisma/client";

type ProjectWithOptionalSetting = Project & { setting?: ProjectSetting | null };

interface ProjectResponseStats {
  totalTaskCount?: number;
  completedTaskCount?: number;
}

export interface UserProfileInfo {
  fullName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
}

type TaskWithCount = Prisma.TaskGetPayload<{
  include: {
    _count: { select: { children: true } };
    checklists: true;
    assignees: true;
    labelMappings: { include: { label: true } };
  };
}>;

export function toProjectResponse(
  project: ProjectWithOptionalSetting,
  stats: ProjectResponseStats = {},
  ownerProfile?: UserProfileInfo | null,
) {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    icon: project.icon,
    description: project.description,
    ownerId: project.ownerId,
    ownerDisplayName: ownerProfile?.fullName ?? null,
    ownerAvatarUrl: ownerProfile?.avatarUrl ?? null,
    ownerEmail: ownerProfile?.email ?? null,
    status: project.status,
    startDate: project.startDate,
    dueDate: project.dueDate,
    archived: project.archived,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    projectSetting: project.setting ?? undefined,
    totalTaskCount: stats.totalTaskCount ?? 0,
    completedTaskCount: stats.completedTaskCount ?? 0,
  };
}

export function toMemberResponse(
  member: ProjectMember,
  profile?: UserProfileInfo | null,
) {
  return {
    id: member.id,
    userId: member.userId,
    displayName: profile?.fullName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    email: profile?.email ?? null,
    role: member.role,
    status: member.status,
    canCreateTask: member.canCreateTask,
    canEditOwnTask: member.canEditOwnTask,
    canEditOthersTask: member.canEditOthersTask,
    canManageMembers: member.canManageMembers,
    canManageLabels: member.canManageLabels,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    updatedAt: member.updatedAt,
  };
}

export function toTaskResponse(
  task: TaskWithCount | Task,
  profilesByUser?: Map<string, UserProfileInfo> | null | unknown,
) {
  const map =
    profilesByUser instanceof Map
      ? (profilesByUser as Map<string, UserProfileInfo>)
      : undefined;

  const childCount =
    "_count" in task && task._count && typeof task._count.children === "number"
      ? task._count.children
      : 0;

  const rawAssignees: TaskAssignee[] =
    "assignees" in task && Array.isArray(task.assignees)
      ? (task.assignees as TaskAssignee[])
      : [];

  const assignees = rawAssignees.map((assignee) => {
    const profile = map?.get(assignee.userId);
    return {
      ...assignee,
      displayName: profile?.fullName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      email: profile?.email ?? null,
    };
  });

  return {
    id: task.id,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    taskNumber: task.taskNumber,
    childCount,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    createdBy: task.createdBy,
    reporterId: task.reporterId,
    startDate: task.startDate,
    dueDate: task.dueDate,
    allDay: task.allDay,
    completedAt: task.completedAt,
    completedBy: task.completedBy,
    deletedAt: task.deletedAt,
    estimatedMinutes: task.estimatedMinutes,
    rank: task.rank,
    archived: task.archived,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    checklists:
      "checklists" in task && Array.isArray(task.checklists)
        ? task.checklists
        : [],
    assignees,
    labels:
      "labelMappings" in task && Array.isArray(task.labelMappings)
        ? task.labelMappings.map((mapping) => mapping.label)
        : [],
  };
}

export function toCommentResponse(
  comment: TaskComment,
  authorProfile?: UserProfileInfo | null,
) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    authorDisplayName: authorProfile?.fullName ?? null,
    authorAvatarUrl: authorProfile?.avatarUrl ?? null,
    authorEmail: authorProfile?.email ?? null,
    content: comment.content,
    edited: comment.edited,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export function toInvitationResponse(
  invitation: ProjectInvitation & { project?: Pick<Project, "name"> | null },
  profilesByUser?: Map<string, UserProfileInfo> | null | unknown,
) {
  const map =
    profilesByUser instanceof Map
      ? (profilesByUser as Map<string, UserProfileInfo>)
      : undefined;

  const invitedUserProfile = map?.get(invitation.invitedUserId);
  const inviterProfile = map?.get(invitation.invitedBy);
  return {
    id: invitation.id,
    projectId: invitation.projectId,
    projectName: invitation.project?.name ?? null,
    invitedUserId: invitation.invitedUserId,
    invitedUserDisplayName: invitedUserProfile?.fullName ?? null,
    invitedUserAvatarUrl: invitedUserProfile?.avatarUrl ?? null,
    invitedUserEmail: invitedUserProfile?.email ?? null,
    invitedBy: invitation.invitedBy,
    inviterDisplayName: inviterProfile?.fullName ?? null,
    inviterAvatarUrl: inviterProfile?.avatarUrl ?? null,
    inviterEmail: inviterProfile?.email ?? null,
    status: invitation.status,
    createdAt: invitation.createdAt,
    respondedAt: invitation.respondedAt,
    expiresAt: invitation.expiresAt,
  };
}

export function toActivityResponse(
  activity: TaskActivity,
  actorProfile?: UserProfileInfo | null,
) {
  return {
    id: activity.id,
    taskId: activity.taskId,
    actorId: activity.actorId,
    actorDisplayName: actorProfile?.fullName ?? null,
    actorAvatarUrl: actorProfile?.avatarUrl ?? null,
    actorEmail: actorProfile?.email ?? null,
    field: activity.field,
    oldValue: activity.oldValue,
    newValue: activity.newValue,
    createdAt: activity.createdAt,
  };
}
