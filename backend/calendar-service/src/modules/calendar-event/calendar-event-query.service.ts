import { CalendarConferenceSyncService } from './calendar-conference-sync.service';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import {
  EventSourceType,
  EventStatus,
  EventVisibility,
  Prisma,
} from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { eventWithRelationsInclude } from './calendar-event.types';
import { GetCalendarEventsQueryDto } from './dto/get-calendar-events-query.dto';
import { GetCalendarTasksQueryDto } from './dto/get-calendar-tasks-query.dto';
import { EventAccessPolicy } from './event-access.policy';
import { EventMapper } from './event.mapper';

@Injectable()
export class CalendarEventQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly mapper: EventMapper,
    private readonly accessPolicy: EventAccessPolicy,
    @Optional() private readonly conferenceSync?: CalendarConferenceSyncService,
  ) {}
  async getEvents(userId: string, filters: GetCalendarEventsQueryDto) {
    this.assertValidQueryRange(filters.startAt, filters.endAt);
    const where = this.buildListFilter(userId, filters);
    const skip = (filters.page - 1) * filters.limit;
    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        include: eventWithRelationsInclude,
        orderBy: { startAt: 'asc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);
    const enriched = await this.userProfiles.attachProfilesToEvents(events);

    return {
      items: this.conferenceSync
        ? await this.conferenceSync.attach(
            enriched.map((event) => this.mapper.toPublicEvent(userId, event)),
          )
        : enriched.map((event) => this.mapper.toPublicEvent(userId, event)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getTasks(userId: string, filters: GetCalendarTasksQueryDto) {
    const where: Prisma.CalendarEventWhereInput = {
      status: { not: EventStatus.CANCELLED },
      OR: [
        { sourceType: EventSourceType.TASK },
        { description: { contains: '[TASK]' } },
      ],
      AND: [
        {
          OR: [
            { calendar: { ownerUserId: userId } },
            { createdBy: userId },
            { attendees: { some: { userId } } },
          ],
        },
      ],
    };
    const skip = (filters.page - 1) * filters.limit;
    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        include: eventWithRelationsInclude,
        orderBy: { startAt: 'asc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);
    const enriched = await this.userProfiles.attachProfilesToEvents(events);

    return {
      items: enriched.map((event) => this.mapper.toPublicEvent(userId, event)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getEventById(userId: string, eventId: string) {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanViewEvent(userId, event);
    const [enriched] = await this.userProfiles.attachProfilesToEvents([event]);
    const mapped = this.mapper.toPublicEvent(userId, enriched);
    return this.conferenceSync
      ? (await this.conferenceSync.attach([mapped]))[0]
      : mapped;
  }

  buildListFilter(
    userId: string,
    filters: GetCalendarEventsQueryDto,
  ): Prisma.CalendarEventWhereInput {
    const where: Prisma.CalendarEventWhereInput = {
      status: { not: EventStatus.CANCELLED },
      OR: [
        { calendar: { ownerUserId: userId } },
        { attendees: { some: { userId } } },
        { visibility: EventVisibility.PUBLIC },
      ],
      calendarId: filters.calendarId,
    };
    const range: Prisma.CalendarEventWhereInput[] = [
      { startAt: { lte: new Date(filters.endAt) } },
      { endAt: { gte: new Date(filters.startAt) } },
    ];
    if (filters.projectId) {
      range.push({ calendar: { projectId: filters.projectId } });
    }
    where.AND = range;
    return where;
  }

  assertValidQueryRange(startAt?: string, endAt?: string): void {
    if (!startAt || !endAt) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_QUERY_RANGE,
      );
    }
    const start = new Date(startAt);
    const end = new Date(endAt);
    const maxRange = CALENDAR_DEFAULTS.MAX_QUERY_RANGE_DAYS * 86_400_000;
    if (end <= start || end.getTime() - start.getTime() > maxRange) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_QUERY_RANGE,
      );
    }
  }
}
