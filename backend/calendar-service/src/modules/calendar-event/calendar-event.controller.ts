import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CALENDAR_ERROR_MESSAGES,
  CALENDAR_SUCCESS_MESSAGES,
} from '../../common/constants/calendar.constants';
import { CalendarEventService } from './calendar-event.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { UpdateEventResponseDto } from './dto/update-event-response.dto';
import { GetCalendarEventsQueryDto } from './dto/get-calendar-events-query.dto';
import { CancelCalendarEventDto } from './dto/cancel-calendar-event.dto';

@Controller('api/calendar/events')
export class CalendarEventController {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Post()
  async createEvent(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string | undefined,
    @Body() dto: CreateCalendarEventDto,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.createEvent(
      userId,
      userEmail,
      dto,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_CREATED,
      data: event,
    };
  }

  @Get()
  async getEvents(
    @Headers('x-user-id') userId: string,
    @Query() query: GetCalendarEventsQueryDto,
  ) {
    this.validateUserId(userId);
    const result = await this.calendarEventService.getEvents(userId, query);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENTS_LISTED,
      data: result.items,
      pagination: {
        totalItems: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':eventId')
  async getEvent(
    @Headers('x-user-id') userId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.getEventById(userId, eventId);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_RETRIEVED,
      data: event,
    };
  }

  @Patch(':eventId')
  async updateEvent(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.updateEvent(
      userId,
      userEmail,
      eventId,
      dto,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_UPDATED,
      data: event,
    };
  }

  @Delete(':eventId')
  async cancelEvent(
    @Headers('x-user-id') userId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query() query: CancelCalendarEventDto,
  ) {
    this.validateUserId(userId);
    await this.calendarEventService.cancelEvent(userId, eventId, query.scope);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_CANCELLED,
    };
  }

  @Patch(':eventId/response')
  async updateResponse(
    @Headers('x-user-id') userId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: UpdateEventResponseDto,
  ) {
    this.validateUserId(userId);
    const attendee = await this.calendarEventService.updateResponse(
      userId,
      eventId,
      dto.responseStatus,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_RESPONSE_UPDATED,
      data: attendee,
    };
  }

  private validateUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.MISSING_USER_ID);
    }
  }
}
