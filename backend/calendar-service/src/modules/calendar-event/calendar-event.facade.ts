import { Injectable } from '@nestjs/common';
import { AttendeeResponseStatus, CalendarEventAttendee } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GetCalendarEventsQueryDto } from './dto/get-calendar-events-query.dto';
import { GetCalendarTasksQueryDto } from './dto/get-calendar-tasks-query.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarEventQueryService } from './calendar-event-query.service';
import { CalendarEventValidationService } from './calendar-event-validation.service';
import { CalendarEventEffectsService } from './calendar-event-effects.service';
import { CalendarEventMutationService } from './calendar-event-mutation.service';
import { CalendarTaskMutationService } from './calendar-task-mutation.service';
import { CalendarAttendeeMutationService } from './calendar-attendee-mutation.service';
import { CalendarConferenceWorkflowService } from './calendar-conference-workflow.service';

@Injectable()
export class CalendarEventService {
  constructor(
    private readonly queries: CalendarEventQueryService,
    private readonly validation: CalendarEventValidationService,
    private readonly effects: CalendarEventEffectsService,
    private readonly mutations: CalendarEventMutationService,
    private readonly tasks: CalendarTaskMutationService,
    private readonly attendees: CalendarAttendeeMutationService,
    private readonly conferences: CalendarConferenceWorkflowService,
  ) {}
  async retryConference(userId: string, eventId: string) {
    return this.conferences.retryConference(userId, eventId);
  }

  async createEvent(
    userId: string,
    userEmail: string | undefined,
    dto: CreateCalendarEventDto,
  ) {
    return this.mutations.createEvent(userId, userEmail, dto);
  }

  async getEvents(userId: string, filters: GetCalendarEventsQueryDto) {
    return this.queries.getEvents(userId, filters);
  }

  async getTasks(userId: string, filters: GetCalendarTasksQueryDto) {
    return this.queries.getTasks(userId, filters);
  }

  async getEventById(userId: string, eventId: string) {
    return this.queries.getEventById(userId, eventId);
  }

  async updateEvent(
    userId: string,
    userEmail: string | undefined,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ) {
    return this.mutations.updateEvent(userId, userEmail, eventId, dto);
  }

  async cancelEvent(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = RecurrenceScope.THIS,
  ): Promise<void> {
    return this.mutations.cancelEvent(userId, eventId, scope);
  }

  async updateTaskCompletion(
    userId: string,
    eventId: string,
    completed: boolean,
  ) {
    return this.tasks.updateTaskCompletion(userId, eventId, completed);
  }

  async updateTaskOrder(userId: string, eventIds: string[]) {
    return this.tasks.updateTaskOrder(userId, eventIds);
  }

  async updateResponse(
    userId: string,
    eventId: string,
    responseStatus: AttendeeResponseStatus,
  ): Promise<CalendarEventAttendee> {
    return this.attendees.updateResponse(userId, eventId, responseStatus);
  }
}
