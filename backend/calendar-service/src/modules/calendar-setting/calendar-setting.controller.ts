import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
} from '@nestjs/common';
import {
  CALENDAR_ERROR_MESSAGES,
  CALENDAR_SUCCESS_MESSAGES,
} from '../../common/constants/calendar.constants';
import { CalendarSettingService } from './calendar-setting.service';
import { UpdateCalendarSettingDto } from './dto/update-calendar-setting.dto';

@Controller('api/calendar/settings')
export class CalendarSettingController {
  constructor(
    private readonly calendarSettingService: CalendarSettingService,
  ) {}

  @Get(':calendarId')
  async getSetting(
    @Headers('x-user-id') userId: string,
    @Param('calendarId') calendarId: string,
  ) {
    this.validateUserId(userId);
    const setting = await this.calendarSettingService.getSetting(
      userId,
      calendarId,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.SETTING_RETRIEVED,
      data: setting,
    };
  }

  @Patch(':calendarId')
  async updateSetting(
    @Headers('x-user-id') userId: string,
    @Param('calendarId') calendarId: string,
    @Body() dto: UpdateCalendarSettingDto,
  ) {
    this.validateUserId(userId);
    const setting = await this.calendarSettingService.updateSetting(
      userId,
      calendarId,
      dto,
    );

    return {
      message: CALENDAR_SUCCESS_MESSAGES.SETTING_UPDATED,
      data: setting,
    };
  }

  private validateUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.MISSING_USER_ID);
    }
  }
}
