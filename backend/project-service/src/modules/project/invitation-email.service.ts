import { Inject, Injectable, Logger } from '@nestjs/common';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import {
  NOTIFICATION_GATEWAY,
  NotificationGateway,
  USER_DIRECTORY,
  UserDirectory,
} from './communication/project-communication.port';

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

  constructor(
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
    @Inject(NOTIFICATION_GATEWAY) private readonly notifications: NotificationGateway,
    private readonly config: RuntimeConfigService,
  ) {}

  async sendSafely(input: InvitationEmailInput): Promise<void> {
    try {
      const [recipient, inviter] = await Promise.all([
        this.users.getContact(input.invitedUserId),
        this.users.getContact(input.inviterId),
      ]);
      await this.notifications.sendInvitationEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        projectName: input.projectName,
        inviterName: inviter.fullName,
        invitationId: input.invitationId,
        acceptUrl: `${this.config.frontendUrl}/invitations`,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      });
    } catch (error) {
      this.logger.error(`Invitation ${input.invitationId} was created, but email delivery failed`, error);
    }
  }
}
