import { CalendarEventEffectsService } from './calendar-event-effects.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendeeResponseStatus,
  CalendarEventAttendee,
  EventStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventAccessPolicy } from './event-access.policy';

@Injectable()
export class CalendarAttendeeMutationService {
  constructor(
    private readonly effects: CalendarEventEffectsService,
    private readonly accessPolicy: EventAccessPolicy,
    private readonly prisma: PrismaService,
  ) {}
  async updateResponse(
    userId: string,
    eventId: string,
    responseStatus: AttendeeResponseStatus,
  ): Promise<CalendarEventAttendee> {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanViewEvent(userId, event);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot respond to a cancelled event');
    }
    const attendee = await this.prisma.calendarEventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    return this.prisma.$transaction(
      async (tx): Promise<CalendarEventAttendee> => {
        let updated: CalendarEventAttendee;
        if (attendee) {
          updated = await tx.calendarEventAttendee.update({
            where: { id: attendee.id },
            data: { responseStatus },
          });
        } else {
          updated = await tx.calendarEventAttendee.create({
            data: {
              eventId,
              userId,
              responseStatus,
              optional: true,
            },
          });
        }

        await tx.calendarEvent.update({
          where: { id: eventId },
          data: { updatedAt: new Date() },
        });

        await this.effects.enqueueResponse(tx, event, userId, responseStatus);
        return updated;
      },
    );
  }
}
