export const USER_DIRECTORY = Symbol("USER_DIRECTORY");
export const NOTIFICATION_GATEWAY = Symbol("NOTIFICATION_GATEWAY");

export const PROJECT_NOTIFICATION_EVENT_TYPES = {
  NOTIFICATION_REQUESTED: "PROJECT_NOTIFICATION_REQUESTED",
  INVITATION_EMAIL_REQUESTED: "PROJECT_INVITATION_EMAIL_REQUESTED",
  INVITATION_STATUS_CHANGED: "PROJECT_INVITATION_STATUS_CHANGED",
} as const;

export interface UserContact {
  email: string;
  fullName?: string;
}

export interface UserDirectory {
  getContact(userId: string): Promise<UserContact>;
}

export interface ProjectNotification {
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface InvitationEmail {
  recipientEmail: string;
  recipientName?: string;
  projectName: string;
  inviterName?: string;
  invitationId: string;
  acceptUrl: string;
  expiresAt: string | null;
}

export type ProjectNotificationEvent =
  | {
      eventId: string;
      eventType: typeof PROJECT_NOTIFICATION_EVENT_TYPES.NOTIFICATION_REQUESTED;
      schemaVersion: 1;
      producer: "project-service";
      aggregateId: string;
      occurredAt: string;
      deliveryAttempt: 0;
      payload: ProjectNotification;
    }
  | {
      eventId: string;
      eventType: typeof PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_EMAIL_REQUESTED;
      schemaVersion: 1;
      producer: "project-service";
      aggregateId: string;
      occurredAt: string;
      deliveryAttempt: 0;
      payload: InvitationEmail;
    }
  | {
      eventId: string;
      eventType: typeof PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_STATUS_CHANGED;
      schemaVersion: 1;
      producer: "project-service";
      aggregateId: string;
      occurredAt: string;
      deliveryAttempt: 0;
      payload: {
        invitationId: string;
        recipientId: string;
        status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
      };
    };

export interface NotificationGateway {
  publish(event: ProjectNotificationEvent): Promise<void>;
}
