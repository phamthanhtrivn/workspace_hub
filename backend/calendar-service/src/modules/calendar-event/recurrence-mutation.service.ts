import { MutationEffect } from './recurrence-mutation.types';
import { Injectable } from '@nestjs/common';
import { Calendar } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { EventWithRelations } from './calendar-event.types';
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { RecurrenceCreationService } from './recurrence-creation.service';
import { RecurrenceTransactionService } from './recurrence-transaction.service';

@Injectable()
export class RecurrenceMutationService {
  constructor(
    private readonly creation: RecurrenceCreationService,
    private readonly transactions: RecurrenceTransactionService,
  ) {}
  async createRecurringEvent(
    userId: string,
    calendar: Calendar,
    dto: CreateCalendarEventDto,
    attendees: CalendarEventAttendeeDto[],
    reminders: CalendarEventReminderDto[],
    afterMutation?: MutationEffect,
  ): Promise<string> {
    return this.creation.createRecurringEvent(
      userId,
      calendar,
      dto,
      attendees,
      reminders,
      afterMutation,
    );
  }

  async convertStandaloneToSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    afterMutation?: MutationEffect,
  ): Promise<string> {
    return this.creation.convertStandaloneToSeries(
      userId,
      event,
      calendar,
      dto,
      afterMutation,
    );
  }

  async updateRecurringEvent(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    afterMutation?: MutationEffect,
  ): Promise<string> {
    return this.transactions.updateRecurringEvent(
      userId,
      event,
      calendar,
      dto,
      afterMutation,
    );
  }

  async cancelEvent(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
    afterMutation?: MutationEffect,
  ): Promise<void> {
    return this.transactions.cancelEvent(userId, event, scope, afterMutation);
  }
}
