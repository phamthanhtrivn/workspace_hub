import { Injectable, Logger } from '@nestjs/common';

interface UserContact {
  email: string;
  fullName?: string;
}

interface InvitationEmailInput {
  invitationId: string;
  projectName: string;
  invitedUserId: string;
  inviterId: string;
  expiresAt: Date | null;
}

@Injectable()
export class InvitationEmailService {
  private readonly logger = new Logger(InvitationEmailService.name);

  async sendSafely(input: InvitationEmailInput): Promise<void> {
    try {
      const [recipient, inviter] = await Promise.all([
        this.getContact(input.invitedUserId),
        this.getContact(input.inviterId),
      ]);
      const serviceKey = process.env.INTERNAL_SERVICE_KEY;
      if (!serviceKey) {
        throw new Error('INTERNAL_SERVICE_KEY is not configured');
      }

      const notificationUrl = this.baseUrl(process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:8084');
      const response = await fetch(`${notificationUrl}/api/notifications/project-invitations/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-key': serviceKey,
        },
        body: JSON.stringify({
          recipientEmail: recipient.email,
          recipientName: recipient.fullName,
          projectName: input.projectName,
          inviterName: inviter.fullName,
          invitationId: input.invitationId,
          acceptUrl: `${this.baseUrl(process.env.FRONTEND_URL ?? 'http://localhost:3000')}/invitations`,
          expiresAt: input.expiresAt?.toISOString() ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Notification service returned ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Invitation ${input.invitationId} was created, but email delivery failed`, error);
    }
  }

  private async getContact(userId: string): Promise<UserContact> {
    const userServiceUrl = this.baseUrl(process.env.USER_SERVICE_URL ?? 'http://localhost:8081');
    const response = await fetch(`${userServiceUrl}/api/users/${userId}/profile`);
    if (!response.ok) {
      throw new Error(`User service returned ${response.status}`);
    }

    const body = await response.json() as { data?: UserContact };
    if (!body.data?.email) {
      throw new Error(`User ${userId} has no email address`);
    }

    return body.data;
  }

  private baseUrl(value: string): string {
    return value.replace(/\/$/, '');
  }
}
