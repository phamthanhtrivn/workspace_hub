import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarSetting } from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCalendarSettingDto } from './dto/update-calendar-setting.dto';

@Injectable()
export class CalendarSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting(
    userId: string,
    calendarId: string,
  ): Promise<CalendarSetting> {
    await this.assertCalendarOwner(userId, calendarId);

    return this.prisma.calendarSetting.upsert({
      where: { calendarId },
      create: {
        calendarId,
        timezone: CALENDAR_DEFAULTS.TIMEZONE,
      },
      update: {},
    });
  }

  async updateSetting(
    userId: string,
    calendarId: string,
    dto: UpdateCalendarSettingDto,
  ): Promise<CalendarSetting> {
    await this.assertCalendarOwner(userId, calendarId);

    return this.prisma.calendarSetting.upsert({
      where: { calendarId },
      create: {
        calendarId,
        timezone: dto.timezone ?? CALENDAR_DEFAULTS.TIMEZONE,
        firstDayOfWeek: dto.firstDayOfWeek,
        showWeekends: dto.showWeekends,
        defaultReminderMinutes: dto.defaultReminderMinutes,
        defaultReminderMethod: dto.defaultReminderMethod,
      },
      update: {
        timezone: dto.timezone,
        firstDayOfWeek: dto.firstDayOfWeek,
        showWeekends: dto.showWeekends,
        defaultReminderMinutes: dto.defaultReminderMinutes,
        defaultReminderMethod: dto.defaultReminderMethod,
      },
    });
  }

  private async assertCalendarOwner(userId: string, calendarId: string) {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id: calendarId },
      select: { ownerUserId: true },
    });

    if (!calendar) {
      throw new NotFoundException(CALENDAR_ERROR_MESSAGES.CALENDAR_NOT_FOUND);
    }

    if (calendar.ownerUserId !== userId) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_CALENDAR);
    }
  }
}
