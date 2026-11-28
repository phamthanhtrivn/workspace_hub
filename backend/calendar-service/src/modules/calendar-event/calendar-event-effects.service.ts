import { CalendarConferenceSyncService } from './calendar-conference-sync.service';
import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventWithRelations } from './calendar-event.types';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';
import { CalendarNotificationOutboxService } from './calendar-notification-outbox.service';

@Injectable()
export class CalendarEventEffectsService {
  constructor(
    private readonly relations: EventRelationService,
    private readonly notificationOutbox: CalendarNotificationOutboxService,
    @Optional() private readonly conferenceSync?: CalendarConferenceSyncService,
  ) {}
  async enqueueUpdateEffects(
    tx: Prisma.TransactionClient,
    userId: string,
    event: EventWithRelations,
    dto: UpdateCalendarEventDto,
  ) {
    const oldAttendeeIds = (event.attendees ?? []).map((a) => a.userId);
    let keptAttendeeIds = oldAttendeeIds.filter((id) => id !== userId);

    if (dto.attendees !== undefined) {
      const newAttendeeIds = this.relations
        .normalizeAttendees(userId, dto.attendees)
        .map((a) => a.userId);

      const removedAttendeeIds = oldAttendeeIds.filter(
        (id) => !newAttendeeIds.includes(id),
      );
      const addedAttendeeIds = newAttendeeIds.filter(
        (id) => !oldAttendeeIds.includes(id),
      );
      keptAttendeeIds = newAttendeeIds.filter(
        (id) => oldAttendeeIds.includes(id) && id !== userId,
      );

      if (removedAttendeeIds.length > 0) {
        await this.notificationOutbox.enqueueAttendeeRemoval(tx, {
          eventTitle: event.title,
          eventId: event.id,
          removerId: userId,
          recipientIds: removedAttendeeIds,
        });
      }

      if (addedAttendeeIds.length > 0) {
        await this.notificationOutbox.enqueueEventInvitations(tx, {
          eventTitle: dto.title || event.title,
          eventId: event.id,
          creatorId: userId,
          recipientIds: addedAttendeeIds,
        });
      }
    }

    if (keptAttendeeIds.length > 0) {
      await this.notificationOutbox.enqueueEventUpdate(tx, {
        eventTitle: dto.title || event.title,
        eventId: event.id,
        updaterId: userId,
        recipientIds: keptAttendeeIds,
      });
    }

    await this.conferenceSync?.reconcileCalendar(tx, event.calendarId);
  }

  async enqueueCreatedSeries(
    tx: Prisma.TransactionClient,
    calendarId: string,
    payload: Parameters<
      CalendarNotificationOutboxService['enqueueEventInvitations']
    >[1],
  ) {
    await this.conferenceSync?.reconcileCalendar(tx, calendarId);
    await this.notificationOutbox.enqueueEventInvitations(tx, payload);
  }
  async enqueueCreatedStandalone(
    tx: Prisma.TransactionClient,
    calendarId: string,
    payload: Parameters<
      CalendarNotificationOutboxService['enqueueEventInvitations']
    >[1],
  ) {
    await this.notificationOutbox.enqueueEventInvitations(tx, payload);
    await this.conferenceSync?.reconcileCalendar(tx, calendarId);
  }
  async enqueueCancellation(
    tx: Prisma.TransactionClient,
    calendarId: string,
    payload: Parameters<
      CalendarNotificationOutboxService['enqueueEventCancellation']
    >[1],
  ) {
    await this.notificationOutbox.enqueueEventCancellation(tx, payload);
    await this.conferenceSync?.reconcileCalendar(tx, calendarId);
  }
  async enqueueResponse(
    tx: Prisma.TransactionClient,
    event: EventWithRelations,
    userId: string,
    responseStatus: Parameters<
      CalendarNotificationOutboxService['enqueueAttendeeResponse']
    >[1]['status'],
  ) {
    if (event.createdBy !== userId) {
      await this.notificationOutbox.enqueueAttendeeResponse(tx, {
        eventTitle: event.title,
        eventId: event.id,
        recipientId: event.createdBy,
        responderId: userId,
        status: responseStatus,
      });
    }
    await this.conferenceSync?.reconcileCalendar(tx, event.calendarId);
  }
}
