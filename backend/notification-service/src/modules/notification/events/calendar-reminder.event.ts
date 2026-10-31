import { Controller, Logger, UseInterceptors } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { KAFKA_TOPICS } from "../../../common/constants/kafka.constants";
import { NotificationType } from "../dtos/create-notification.dto";
import { EmailService } from "../email.service";
import { NotificationService } from "../notification.service";
import { parseCalendarReminder } from './calendar-reminder.payload';
import { InvalidKafkaEventInterceptor } from '../../../common/interceptors/invalid-kafka-event.interceptor';

@Controller()
@UseInterceptors(InvalidKafkaEventInterceptor)
export class CalendarReminderEvent {
  private readonly logger = new Logger(CalendarReminderEvent.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly email: EmailService,
  ) {}

  @EventPattern(KAFKA_TOPICS.CALENDAR_REMINDER_TOPIC)
  async handle(@Payload() message: unknown) {
    const payload = parseCalendarReminder(message);
    if (!payload) return;

    for (const recipient of payload.recipients) {
      const content = `${payload.event.title} starts at ${new Date(payload.event.startAt).toLocaleString()}`;
      if (payload.method === "EMAIL") {
        if (!recipient.email) {
          this.logger.warn(`Skipping email reminder without email for ${recipient.userId}`);
          continue;
        }
        await this.email.sendCalendarReminderEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.fullName,
          eventTitle: payload.event.title,
          startAt: payload.event.startAt,
          location: payload.event.location,
          eventUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/calendar?eventId=${payload.event.id}`,
        });
        continue;
      }

      await this.notifications.createNotification(
        {
          recipientId: recipient.userId,
          type: NotificationType.CALENDAR_REMINDER,
          title: "Calendar reminder",
          content,
          link: `/calendar?eventId=${payload.event.id}`,
          metadata: {
            deliveryId: payload.deliveryId,
            eventId: payload.event.id,
            method: payload.method,
          },
        },
        { sendPush: payload.method === "PUSH" },
      );
    }
  }
}
