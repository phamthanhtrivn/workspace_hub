import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { SpaceNotificationEvent } from './events/space-notification.event';
import { SpaceInvitationNotificationHandler } from './events/space-invitation-notification.service';

@Module({
  imports: [],
  controllers: [NotificationController, SpaceNotificationEvent],
  providers: [
    NotificationService,
    NotificationGateway,
    EmailService,
    PushService,
    SpaceInvitationNotificationHandler,
  ],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
