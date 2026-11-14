import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../../../common/constants/kafka.constants';
import { CalendarReminderDeliveryService } from '../calendar-reminder-delivery.service';
import { CalendarReminderEmailService } from '../calendar-reminder-email.service';
import { parseCalendarReminder } from './calendar-reminder.payload';
import { InvalidKafkaEventInterceptor } from '../../../common/interceptors/invalid-kafka-event.interceptor';

@Controller()
@UseInterceptors(InvalidKafkaEventInterceptor)
export class CalendarReminderEvent {
  private readonly logger = new Logger(CalendarReminderEvent.name);
  constructor(
    private readonly delivery: CalendarReminderDeliveryService,
    private readonly email: CalendarReminderEmailService,
  ) {}

  @EventPattern(KAFKA_TOPICS.CALENDAR_REMINDER_TOPIC)
  async handle(@Payload() message: unknown) {
    const payload = parseCalendarReminder(message);
    if (!payload) return;

    let failed = false;
    const recipients = new Map(
      payload.recipients.map((recipient) => [recipient.userId, recipient]),
    );
    for (const recipient of recipients.values()) {
      try {
        if (payload.method === 'EMAIL')
          await this.email.deliver(payload, recipient);
        else await this.delivery.deliver(payload, recipient.userId);
      } catch {
        this.logger.warn(
          `Reminder ${payload.groupKey ?? payload.deliveryId} channel ${payload.method} recipient ${recipient.userId} is unresolved; check delivery receipts and dependency health`,
        );
        failed = true;
      }
    }
    // Retry unresolved recipients; durable channel claims protect successful ones.
    if (failed)
      throw new Error('Calendar reminder delivery has unresolved recipients');
  }
}
