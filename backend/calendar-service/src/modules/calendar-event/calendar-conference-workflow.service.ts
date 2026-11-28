import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventAccessPolicy } from './event-access.policy';
import { CalendarEventQueryService } from './calendar-event-query.service';

@Injectable()
export class CalendarConferenceWorkflowService {
  constructor(
    private readonly accessPolicy: EventAccessPolicy,
    private readonly prisma: PrismaService,
    private readonly queries: CalendarEventQueryService,
  ) {}
  async retryConference(userId: string, eventId: string) {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanManageEvent(userId, event);
    await this.prisma.calendarConference.updateMany({
      where: { eventId, enabled: true },
      data: { status: 'PENDING', nextAttemptAt: new Date(), attemptCount: 0 },
    });
    return this.queries.getEventById(userId, eventId);
  }
}
