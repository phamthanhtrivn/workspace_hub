import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Calendar, ReminderMethod } from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createCalendar(
    userId: string,
    dto: CreateCalendarDto,
  ): Promise<Calendar> {
    const calendarCount = await this.prisma.calendar.count({
      where: { ownerUserId: userId },
    });
    const shouldBeDefault = dto.isDefault === true || calendarCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.calendar.updateMany({
          where: { ownerUserId: userId },
          data: { isDefault: false },
        });
      }

      return tx.calendar.create({
        data: {
          ownerUserId: userId,
          projectId: dto.projectId ?? null,
          name: dto.name,
          description: dto.description ?? null,
          color: dto.color ?? CALENDAR_DEFAULTS.COLOR,
          isDefault: shouldBeDefault,
          isVisible: dto.isVisible ?? true,
          setting: {
            create: {
              timezone: CALENDAR_DEFAULTS.TIMEZONE,
              defaultReminderMinutes:
                CALENDAR_DEFAULTS.DEFAULT_REMINDER_MINUTES,
              defaultReminderMethod: ReminderMethod.ALERT,
            },
          },
        },
        include: { setting: true },
      });
    });
  }

  async getUserCalendars(userId: string): Promise<Calendar[]> {
    return this.prisma.calendar.findMany({
      where: { ownerUserId: userId },
      include: { setting: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async updateCalendar(
    userId: string,
    calendarId: string,
    dto: UpdateCalendarDto,
  ): Promise<Calendar> {
    await this.assertCalendarOwner(userId, calendarId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.calendar.updateMany({
          where: { ownerUserId: userId, id: { not: calendarId } },
          data: { isDefault: false },
        });
      }

      return tx.calendar.update({
        where: { id: calendarId },
        data: {
          name: dto.name,
          description: dto.description,
          projectId: dto.projectId,
          color: dto.color,
          isDefault: dto.isDefault,
          isVisible: dto.isVisible,
        },
        include: { setting: true },
      });
    });
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    const calendar = await this.assertCalendarOwner(userId, calendarId);

    await this.prisma.calendar.delete({ where: { id: calendar.id } });

    if (calendar.isDefault) {
      const nextCalendar = await this.prisma.calendar.findFirst({
        where: { ownerUserId: userId },
        orderBy: { createdAt: 'asc' },
      });

      if (nextCalendar) {
        await this.prisma.calendar.update({
          where: { id: nextCalendar.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async assertCalendarOwner(
    userId: string,
    calendarId: string,
  ): Promise<Calendar> {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id: calendarId },
    });

    if (!calendar) {
      throw new NotFoundException(CALENDAR_ERROR_MESSAGES.CALENDAR_NOT_FOUND);
    }

    if (calendar.ownerUserId !== userId) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_CALENDAR);
    }

    return calendar;
  }
}
