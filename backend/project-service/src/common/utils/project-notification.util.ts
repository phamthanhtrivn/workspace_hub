import { KAFKA_EVENTS } from '../constants/kafka.constants';
import type { ProjectNotification } from '../adapters/project-communication.port';

export function projectNotificationIdentity(project: {
  id: string; name: string; icon?: string | null; color?: string | null;
}) {
  return {
    projectId: project.id,
    projectName: project.name,
    projectIcon: project.icon ?? null,
    projectColor: project.color ?? null,
  };
}

export function buildInvitationResponseNotification(
  invitation: {
    id: string;
    projectId: string;
    invitedBy: string;
    invitedUserId: string;
    project: { name: string; icon?: string | null; color?: string | null };
    createdAt: Date;
  },
  status: 'ACCEPTED' | 'DECLINED',
): ProjectNotification {
  const accepted = status === 'ACCEPTED';

  return {
    recipientId: invitation.invitedBy,
    senderId: invitation.invitedUserId,
    type: accepted
      ? KAFKA_EVENTS.NOTIFICATION.PROJECT_INVITATION_ACCEPTED
      : KAFKA_EVENTS.NOTIFICATION.PROJECT_INVITATION_DECLINED,
    title: accepted
      ? 'Project invitation accepted'
      : 'Project invitation declined',
    content: `Your invitation to project "${invitation.project.name}" was ${accepted ? 'accepted' : 'declined'}.`,
    link: `/projects/${invitation.projectId}`,
    metadata: {
      projectId: invitation.projectId,
      projectName: invitation.project.name,
      projectIcon: invitation.project.icon ?? null,
      projectColor: invitation.project.color ?? null,
      invitationId: invitation.id,
      invitedUserId: invitation.invitedUserId,
      status,
      invitedAt: invitation.createdAt.toISOString(),
      respondedAt: new Date().toISOString(),
    },
  };
}

export const PROJECT_PERMISSION_LABELS = {
  canCreateTask: 'Create tasks',
  canEditOwnTask: 'Edit own tasks',
  canEditOthersTask: "Edit other members' tasks",
  canManageMembers: 'Manage members',
  canManageLabels: 'Manage labels',
  canEditDocuments: 'Edit documents',
} as const;
