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
} from '@nestjs/common';
import {
  CALENDAR_ERROR_MESSAGES,
  CALENDAR_SUCCESS_MESSAGES,
} from '../../common/constants/calendar.constants';
import { CalendarService } from './calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

@Controller('api/calendar/calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  async createCalendar(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateCalendarDto,
  ) {
    this.validateUserId(userId);
    const calendar = await this.calendarService.createCalendar(userId, dto);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.CALENDAR_CREATED,
      data: calendar,
    };
  }

  @Get()
  async getCalendars(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const calendars = await this.calendarService.getUserCalendars(userId);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.CALENDARS_LISTED,
      data: calendars,
    };
  }

  @Patch(':calendarId')
  async updateCalendar(
    @Headers('x-user-id') userId: string,
    @Param('calendarId', new ParseUUIDPipe()) calendarId: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    this.validateUserId(userId);
    const calendar = await this.calendarService.updateCalendar(
      userId,
      calendarId,
      dto,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.CALENDAR_UPDATED,
      data: calendar,
    };
  }

  @Delete(':calendarId')
  async deleteCalendar(
    @Headers('x-user-id') userId: string,
    @Param('calendarId', new ParseUUIDPipe()) calendarId: string,
  ) {
    this.validateUserId(userId);
    await this.calendarService.deleteCalendar(userId, calendarId);

    return {
      message: CALENDAR_SUCCESS_MESSAGES.CALENDAR_DELETED,
    };
  }

  private validateUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.MISSING_USER_ID);
    }
  }
}
