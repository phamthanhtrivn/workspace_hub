import { Prisma, Project, ProjectInvitation, ProjectMember, ProjectSetting, Task, TaskComment } from '@prisma/client';

type ProjectWithOptionalSetting = Project & { setting?: ProjectSetting | null };

interface ProjectResponseStats {
  totalTaskCount?: number;
  completedTaskCount?: number;
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
) {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    icon: project.icon,
    description: project.description,
    ownerId: project.ownerId,
    status: project.status,
    projectType: project.projectType,
    visibility: project.visibility,
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

export function toMemberResponse(member: ProjectMember) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    updatedAt: member.updatedAt,
  };
}

export function toTaskResponse(task: TaskWithCount | Task) {
  const childCount = '_count' in task ? task._count.children : 0;

  return {
    id: task.id,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    taskNumber: task.taskNumber,
    taskType: task.taskType,
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
    isParentTask: task.isParentTask,
    autoCompleteSprint: task.autoCompleteSprint,
    sprintId: task.sprintId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    checklists: 'checklists' in task ? task.checklists : [],
    assignees: 'assignees' in task ? task.assignees : [],
    labels: 'labelMappings' in task ? task.labelMappings.map((mapping) => mapping.label) : [],
  };
}

export function toCommentResponse(comment: TaskComment) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    content: comment.content,
    edited: comment.edited,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export function toInvitationResponse(
  invitation: ProjectInvitation & { project?: Pick<Project, 'name'> | null },
) {
  return {
    id: invitation.id,
    projectId: invitation.projectId,
    projectName: invitation.project?.name ?? null,
    invitedUserId: invitation.invitedUserId,
    invitedBy: invitation.invitedBy,
    status: invitation.status,
    createdAt: invitation.createdAt,
    respondedAt: invitation.respondedAt,
    expiresAt: invitation.expiresAt,
  };
}
