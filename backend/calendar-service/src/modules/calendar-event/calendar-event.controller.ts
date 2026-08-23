import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
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

@Controller('api/calendar/events')
export class CalendarEventController {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Post()
  async createEvent(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateCalendarEventDto,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.createEvent(userId, dto);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_CREATED,
      data: event,
    };
  }

  @Get()
  async getEvents(
    @Headers('x-user-id') userId: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('calendarId') calendarId?: string,
    @Query('projectId') projectId?: string,
  ) {
    this.validateUserId(userId);
    const events = await this.calendarEventService.getEvents(userId, {
      startAt,
      endAt,
      calendarId,
      projectId,
    });

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENTS_LISTED,
      data: events,
    };
  }

  @Get(':eventId')
  async getEvent(
    @Headers('x-user-id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.getEventById(
      userId,
      eventId,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_RETRIEVED,
      data: event,
    };
  }

  @Patch(':eventId')
  async updateEvent(
    @Headers('x-user-id') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    this.validateUserId(userId);
    const event = await this.calendarEventService.updateEvent(
      userId,
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
    @Param('eventId') eventId: string,
  ) {
    this.validateUserId(userId);
    await this.calendarEventService.cancelEvent(userId, eventId);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.EVENT_CANCELLED,
    };
  }

  @Patch(':eventId/response')
  async updateResponse(
    @Headers('x-user-id') userId: string,
    @Param('eventId') eventId: string,
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
