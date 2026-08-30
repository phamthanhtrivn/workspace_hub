import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { KAFKA_TOPICS } from "../../../common/constants/kafka.constants";
import { NotificationType } from "../dtos/create-notification.dto";
import { EmailService } from "../email.service";
import { NotificationService } from "../notification.service";

interface CalendarReminderPayload {
  eventType: "CALENDAR_REMINDER_DUE";
  deliveryId: string;
  method: "ALERT" | "PUSH" | "EMAIL";
  event: {
    id: string;
    title: string;
    startAt: string;
    location?: string | null;
  };
  recipients: Array<{
    userId: string;
    email?: string | null;
    fullName?: string | null;
  }>;
}

@Controller()
export class CalendarReminderEvent {
  private readonly logger = new Logger(CalendarReminderEvent.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly email: EmailService,
  ) {}

  @EventPattern(KAFKA_TOPICS.CALENDAR_REMINDER_TOPIC)
  async handle(@Payload() message: CalendarReminderPayload | { value: CalendarReminderPayload }) {
    const payload = "value" in message ? message.value : message;
    if (payload.eventType !== "CALENDAR_REMINDER_DUE") return;

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
