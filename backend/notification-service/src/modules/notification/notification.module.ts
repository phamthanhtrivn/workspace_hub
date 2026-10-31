import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { NotificationGateway } from "./notification.gateway";
import { EmailService } from "./email.service";
import { PushService } from "./push.service";
import { SpaceNotificationEvent } from "./events/space-notification.event";
import { SpaceInvitationNotificationHandler } from "./events/space-invitation-notification.service";
import { CalendarReminderEvent } from "./events/calendar-reminder.event";
import { InvalidKafkaEventInterceptor } from "../../common/interceptors/invalid-kafka-event.interceptor";
import { NotificationQueryService } from "./notification-query.service";
import { NotificationMutationService } from "./notification-mutation.service";
import { NotificationSubscriptionService } from "./notification-subscription.service";
import { NotificationDeliveryService } from "./notification-delivery.service";

@Module({
  imports: [],
  controllers: [
    NotificationController,
    SpaceNotificationEvent,
    CalendarReminderEvent,
  ],
  providers: [
    InvalidKafkaEventInterceptor,
    NotificationService,
    NotificationQueryService,
    NotificationMutationService,
    NotificationSubscriptionService,
    NotificationDeliveryService,
    NotificationGateway,
    EmailService,
    PushService,
    SpaceInvitationNotificationHandler,
  ],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
