export const USER_DIRECTORY = Symbol("USER_DIRECTORY");
export const NOTIFICATION_GATEWAY = Symbol("NOTIFICATION_GATEWAY");

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

export interface NotificationGateway {
  send(event: ProjectNotification): Promise<void>;
  sendInvitationEmail(email: InvitationEmail): Promise<void>;
  updateProjectInvitationStatus(
    invitationId: string,
    recipientId: string,
    status: "ACCEPTED" | "DECLINED",
  ): Promise<void>;
}
