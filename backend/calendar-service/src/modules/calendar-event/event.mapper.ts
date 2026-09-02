import { Injectable } from '@nestjs/common';
import { EventSourceType } from '@prisma/client';
import { EventWithRelations } from './calendar-event.types';

@Injectable()
export class EventMapper {
  toPublicEvent<T extends EventWithRelations>(userId: string, event: T) {
    const canManage =
      event.sourceType === EventSourceType.USER &&
      (event.calendar.ownerUserId === userId || event.createdBy === userId);
    const canRespond = event.attendees.some(
      (attendee) => attendee.userId === userId,
    );
    const { documents, recurrenceSeries, ...publicEvent } = event;

    return {
      ...publicEvent,
      documentIds: documents.map((document) => document.documentId),
      exceptionDates:
        recurrenceSeries?.exceptions.map((exception) =>
          exception.occurrenceStart.toISOString(),
        ) ?? [],
      recurrenceRule: recurrenceSeries?.recurrenceRule ?? null,
      recurrenceParentId: recurrenceSeries?.id ?? null,
      timeZone: recurrenceSeries?.timeZone ?? event.calendar.timeZone,
      permissions: { canManage, canRespond },
    };
  }
}
