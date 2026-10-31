import { Injectable } from '@nestjs/common';
import { EventSourceType, EventStatus } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { ResourceAccessService } from '../../infrastructure/integrations/resource-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventWithRelations } from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventAccessPolicy } from './event-access.policy';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';
import { CalendarEventValidationService } from './calendar-event-validation.service';
import { CalendarEventQueryService } from './calendar-event-query.service';
import { CalendarEventEffectsService } from './calendar-event-effects.service';

@Injectable()
export class CalendarEventMutationService {
  constructor(
    private readonly accessPolicy: EventAccessPolicy,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly resourceAccess: ResourceAccessService,
    private readonly relations: EventRelationService,
    private readonly recurrenceMutations: RecurrenceMutationService,
    private readonly prisma: PrismaService,
    private readonly validation: CalendarEventValidationService,
    private readonly queries: CalendarEventQueryService,
    private readonly effects: CalendarEventEffectsService,
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
    this.accessPolicy.assertPersonalCalendar(calendar);
    this.validation.assertValidRange(dto.startAt, dto.endAt);
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
        async (tx, firstId) => {
          await this.effects.enqueueCreatedSeries(tx, calendar.id, {
            eventTitle: dto.title,
            eventId: firstId,
            creatorId: userId,
            recipientIds: attendees.map((attendee) => attendee.userId),
          });
        },
      );
      return this.queries.getEventById(userId, eventId);
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.calendarEvent.create({
        data: {
          calendarId: calendar.id,
          createdBy: userId,
          title: dto.title,
          description: dto.description ?? null,
          location: dto.location ?? null,
          conferenceEnabled: dto.conference?.enabled ?? false,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          allDay: dto.allDay ?? false,
          color: dto.color ?? calendar.color,
          status: dto.status ?? EventStatus.CONFIRMED,
          visibility: dto.visibility,
          sourceType: dto.sourceType ?? EventSourceType.USER,
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
      await this.effects.enqueueCreatedStandalone(tx, calendar.id, {
        eventTitle: created.title,
        eventId: created.id,
        creatorId: userId,
        recipientIds: attendees.map((attendee) => attendee.userId),
      });
      return created;
    });

    return this.queries.getEventById(userId, event.id);
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
    this.accessPolicy.assertPersonalCalendar(calendar);
    this.validation.assertValidRange(
      dto.startAt ?? event.startAt.toISOString(),
      dto.endAt ?? event.endAt.toISOString(),
    );

    const updatedId = await this.updateByRecurrenceState(
      userId,
      event,
      calendar,
      dto,
    );
    return this.queries.getEventById(userId, updatedId);
  }

  async cancelEvent(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = RecurrenceScope.THIS,
  ): Promise<void> {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanManageEvent(userId, event);
    this.accessPolicy.assertUserManagedEvent(event);
    const recipientIds = (event.attendees ?? []).map(
      (attendee) => attendee.userId,
    );
    await this.recurrenceMutations.cancelEvent(
      userId,
      event,
      scope,
      async (tx) => {
        await this.effects.enqueueCancellation(tx, event.calendarId, {
          eventTitle: event.title,
          eventId: event.id,
          cancellerId: userId,
          recipientIds,
        });
      },
    );
  }

  async updateByRecurrenceState(
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
        (tx, updatedId) =>
          this.effects.enqueueUpdateEffects(
            tx,
            userId,
            { ...event, id: updatedId },
            dto,
          ),
      );
    }
    if (dto.recurrenceRule) {
      return this.recurrenceMutations.convertStandaloneToSeries(
        userId,
        event,
        calendar,
        dto,
        (tx, updatedId) =>
          this.effects.enqueueUpdateEffects(
            tx,
            userId,
            { ...event, id: updatedId },
            dto,
          ),
      );
    }
    await this.updateStandaloneEvent(userId, event, calendar, dto);
    return event.id;
  }

  async updateStandaloneEvent(
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
          conferenceEnabled: dto.conference?.enabled,
          startAt: dto.startAt ? nextStartAt : undefined,
          endAt: dto.endAt ? nextEndAt : undefined,
          allDay: dto.allDay,
          color: dto.color,
          status: dto.status,
          visibility: dto.visibility,
          cancelledAt: this.validation.getCancelledAt(dto.status),
        },
      });
      await this.relations.replaceEventRelations(tx, event, nextStartAt, dto);
      await this.effects.enqueueUpdateEffects(tx, userId, event, dto);
    });
  }
}
