import { AttendeeResponseStatus } from '@prisma/client';
import { of, throwError } from 'rxjs';
import { CalendarNotificationService } from './calendar-notification.service';

describe('CalendarNotificationService', () => {
  const payload = {
    recipientId: '11111111-1111-1111-1111-111111111111',
    senderId: '22222222-2222-2222-2222-222222222222',
    type: 'CALENDAR_REMINDER',
    title: 'Event invitation',
    content: 'You were invited to Planning',
    link: '/calendar?event=33333333-3333-3333-3333-333333333333',
    metadata: { eventId: '33333333-3333-3333-3333-333333333333' },
  };

  it('publishes notification payloads to the shared Kafka topic', async () => {
    const kafka = { emit: jest.fn(() => of(undefined)) };
    const service = new CalendarNotificationService(kafka as never);

    await service.sendNotification(payload);

    expect(kafka.emit).toHaveBeenCalledWith('notification-topic', {
      key: payload.recipientId,
      value: payload,
    });
  });

  it('does not fail the calendar operation when Kafka is unavailable', async () => {
    const kafka = {
      emit: jest.fn(() => throwError(() => new Error('Kafka unavailable'))),
    };
    const service = new CalendarNotificationService(kafka as never);

    await expect(service.sendNotification(payload)).resolves.toBeUndefined();
  });

  it('does not notify a responder about their own response', async () => {
    const kafka = { emit: jest.fn(() => of(undefined)) };
    const service = new CalendarNotificationService(kafka as never);

    await service.notifyAttendeeResponse({
      eventTitle: 'Planning',
      eventId: '33333333-3333-3333-3333-333333333333',
      recipientId: payload.senderId,
      responderId: payload.senderId,
      status: AttendeeResponseStatus.ACCEPTED,
    });

    expect(kafka.emit).not.toHaveBeenCalled();
  });
});
