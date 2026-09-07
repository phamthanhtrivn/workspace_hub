import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { SpaceNotificationEvent } from './events/space-notification.event';
import { SpaceInvitationNotificationHandler } from './events/space-invitation-notification.service';
import { CalendarReminderEvent } from './events/calendar-reminder.event';
import { ProjectNotificationEvent } from './events/project-notification.event';
import {
  KAFKA_CLIENTS,
  NOTIFICATION_RETRY_KAFKA_CLIENT,
} from '../../common/constants/kafka.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: NOTIFICATION_RETRY_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: KAFKA_CLIENTS.NOTIFICATION_RETRY_PRODUCER.CLIENT_ID,
            brokers: (process.env.KAFKA_BROKER ?? 'localhost:9092')
              .split(',')
              .map((broker) => broker.trim())
              .filter(Boolean),
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  controllers: [
    NotificationController,
    SpaceNotificationEvent,
    CalendarReminderEvent,
    ProjectNotificationEvent,
  ],
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
