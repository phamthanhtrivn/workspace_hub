import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AttendeeResponseStatus,
  EventStatus,
  EventVisibility,
  Prisma,
} from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { ResourceAccessService } from '../../infrastructure/integrations/resource-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import {
  EventWithRelations,
  eventWithRelationsInclude,
} from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GetCalendarEventsQueryDto } from './dto/get-calendar-events-query.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventAccessPolicy } from './event-access.policy';
import { EventMapper } from './event.mapper';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';

@Injectable()
export class CalendarEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly resourceAccess: ResourceAccessService,
    private readonly accessPolicy: EventAccessPolicy,
    private readonly mapper: EventMapper,
    private readonly relations: EventRelationService,
    private readonly recurrenceMutations: RecurrenceMutationService,
  ) {}

  async createEvent(
    userId: string,
    userEmail: string | undefined,
    dto: CreateCalendarEventDto,
  ) {
    const calendar = await this.accessPolicy.assertCalendarOwner(
      userId,
      dto.calendarId,
    );
    await this.resourceAccess.assertProjectAccess(userId, calendar.projectId);
    this.assertValidRange(dto.startAt, dto.endAt);
    this.recurrence.assertValidRule(dto.recurrenceRule);
    await this.resourceAccess.assertDocumentAccess(
      userId,
      userEmail,
      dto.documentIds,
    );

    const attendees = this.relations.normalizeAttendees(userId, dto.attendees);
    const reminders = this.relations.normalizeReminders(dto.reminders);
    if (dto.recurrenceRule) {
      const eventId = await this.recurrenceMutations.createRecurringEvent(
        userId,
        calendar,
        dto,
        attendees,
        reminders,
      );
      return this.getEventById(userId, eventId);
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.calendarEvent.create({
        data: {
          calendarId: calendar.id,
          createdBy: userId,
          title: dto.title,
          description: dto.description ?? null,
          location: dto.location ?? null,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          allDay: dto.allDay ?? false,
          color: dto.color ?? calendar.color,
          status: dto.status ?? EventStatus.CONFIRMED,
          visibility: dto.visibility,
        },
      });
      await this.relations.createEventRelations(
        tx,
        created.id,
        userId,
        new Date(dto.startAt),
        {
          attendees,
          reminders,
          documentIds: dto.documentIds ?? [],
        },
      );
      return created;
    });
    return this.getEventById(userId, event.id);
  }

  async getEvents(userId: string, filters: GetCalendarEventsQueryDto) {
    this.assertValidQueryRange(filters.startAt, filters.endAt);
    await this.resourceAccess.assertProjectAccess(userId, filters.projectId);
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
    return this.mapper.toPublicEvent(userId, enriched);
  }

  async updateEvent(
    userId: string,
    userEmail: string | undefined,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ) {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanManageEvent(userId, event);
    this.accessPolicy.assertUserManagedEvent(event);
    this.recurrence.assertValidRule(dto.recurrenceRule);
    await this.resourceAccess.assertDocumentAccess(
      userId,
      userEmail,
      dto.documentIds,
    );

    const calendar = dto.calendarId
      ? await this.accessPolicy.assertCalendarOwner(userId, dto.calendarId)
      : event.calendar;
    await this.resourceAccess.assertProjectAccess(userId, calendar.projectId);
    this.assertValidRange(
      dto.startAt ?? event.startAt.toISOString(),
      dto.endAt ?? event.endAt.toISOString(),
    );

    const updatedId = await this.updateByRecurrenceState(
      userId,
      event,
      calendar,
      dto,
    );
    return this.getEventById(userId, updatedId);
  }

  async cancelEvent(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = RecurrenceScope.THIS,
  ): Promise<void> {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanManageEvent(userId, event);
    this.accessPolicy.assertUserManagedEvent(event);
    await this.recurrenceMutations.cancelEvent(userId, event, scope);
  }

  async updateResponse(
    userId: string,
    eventId: string,
    responseStatus: AttendeeResponseStatus,
  ) {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot respond to a cancelled event');
    }
    const attendee = await this.prisma.calendarEventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!attendee) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_RESPONSE);
    }
    return this.prisma.calendarEventAttendee.update({
      where: { id: attendee.id },
      data: { responseStatus },
    });
  }

  private async updateByRecurrenceState(
    userId: string,
    event: EventWithRelations,
    calendar: EventWithRelations['calendar'],
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    if (event.recurrenceSeries) {
      return this.recurrenceMutations.updateRecurringEvent(
        userId,
        event,
        calendar,
        dto,
      );
    }
    if (dto.recurrenceRule) {
      return this.recurrenceMutations.convertStandaloneToSeries(
        userId,
        event,
        calendar,
        dto,
      );
    }
    await this.updateStandaloneEvent(userId, event, calendar, dto);
    return event.id;
  }

  private async updateStandaloneEvent(
    userId: string,
    event: EventWithRelations,
    calendar: EventWithRelations['calendar'],
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    await this.prisma.$transaction(async (tx) => {
      await tx.calendarEvent.update({
        where: { id: event.id },
        data: {
          calendarId: calendar.id,
          updatedBy: userId,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startAt: dto.startAt ? nextStartAt : undefined,
          endAt: dto.endAt ? nextEndAt : undefined,
          allDay: dto.allDay,
          color: dto.color,
          status: dto.status,
          visibility: dto.visibility,
          cancelledAt: this.getCancelledAt(dto.status),
        },
      });
      await this.relations.replaceEventRelations(tx, event, nextStartAt, dto);
    });
  }

  private buildListFilter(
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

  private assertValidRange(startAt: string, endAt: string): void {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }

  private assertValidQueryRange(startAt?: string, endAt?: string): void {
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

  private getCancelledAt(status?: EventStatus): Date | null | undefined {
    if (status === EventStatus.CANCELLED) return new Date();
    return status ? null : undefined;
  }
}
