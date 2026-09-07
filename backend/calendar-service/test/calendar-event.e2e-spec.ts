/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { RecurrenceScope } from '../src/common/enums/calendar.enum';
import { CalendarEventController } from '../src/modules/calendar-event/calendar-event.controller';
import { CalendarEventService } from '../src/modules/calendar-event/calendar-event.service';

describe('Calendar event API (integration)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const eventId = '22222222-2222-2222-2222-222222222222';
  let app: INestApplication;
  const eventService = {
    getEvents: jest.fn(),
    cancelEvent: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CalendarEventController],
      providers: [{ provide: CalendarEventService, useValue: eventService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('validates query dates before calling the service', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/calendar/events?startAt=not-a-date&endAt=2026-08-30T00:00:00.000Z',
      )
      .set('x-user-id', userId)
      .expect(400);

    expect(eventService.getEvents).not.toHaveBeenCalled();
  });

  it('requires a bounded date range', async () => {
    await request(app.getHttpServer())
      .get('/api/calendar/events')
      .set('x-user-id', userId)
      .expect(400);

    expect(eventService.getEvents).not.toHaveBeenCalled();
  });

  it('returns pagination in the standard response envelope', async () => {
    eventService.getEvents.mockResolvedValue({
      items: [{ id: eventId, title: 'Planning' }],
      total: 41,
      page: 2,
      limit: 20,
    });

    const response = await request(app.getHttpServer())
      .get(
        '/api/calendar/events?startAt=2026-08-01T00:00:00.000Z&endAt=2026-08-30T00:00:00.000Z&page=2&limit=20',
      )
      .set('x-user-id', userId)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      totalItems: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it('passes recurrence cancellation scope to the service', async () => {
    eventService.cancelEvent.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete(`/api/calendar/events/${eventId}?scope=THIS_AND_FOLLOWING`)
      .set('x-user-id', userId)
      .expect(200);

    expect(eventService.cancelEvent).toHaveBeenCalledWith(
      userId,
      eventId,
      RecurrenceScope.THIS_AND_FOLLOWING,
    );
  });

  it('rejects malformed UUID path parameters', async () => {
    await request(app.getHttpServer())
      .delete('/api/calendar/events/not-a-uuid')
      .set('x-user-id', userId)
      .expect(400);
  });
});
