import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
          icon: dto.icon === undefined ? CALENDAR_DEFAULTS.ICON : dto.icon,
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
    await this.ensureDefaultCalendar(userId);

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
      const updateData = { ...dto };

      if (dto.isDefault === true) {
        await tx.calendar.updateMany({
          where: { ownerUserId: userId, id: { not: calendarId } },
          data: { isDefault: false },
        });
      }

      return tx.calendar.update({
        where: { id: calendarId },
        data: {
          name: updateData.name,
          icon: updateData.icon,
          description: updateData.description,
          projectId: updateData.projectId,
          color: updateData.color,
          isDefault: updateData.isDefault === false ? undefined : updateData.isDefault,
          isVisible: updateData.isVisible,
        },
        include: { setting: true },
      });
    });
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    const calendar = await this.assertCalendarOwner(userId, calendarId);

    if (calendar.isDefault) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.FORBIDDEN_DEFAULT_CALENDAR_DELETE,
      );
    }

    await this.prisma.calendar.delete({ where: { id: calendar.id } });
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

  private async ensureDefaultCalendar(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const defaultCalendar = await tx.calendar.findFirst({
        where: { ownerUserId: userId, isDefault: true },
      });

      if (defaultCalendar) return;

      const firstCalendar = await tx.calendar.findFirst({
        where: { ownerUserId: userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstCalendar) {
        await tx.calendar.update({
          where: { id: firstCalendar.id },
          data: { isDefault: true, isVisible: true },
        });
        return;
      }

      await tx.calendar.create({
        data: {
          ownerUserId: userId,
          name: CALENDAR_DEFAULTS.NAME,
          icon: CALENDAR_DEFAULTS.ICON,
          color: CALENDAR_DEFAULTS.COLOR,
          isDefault: true,
          isVisible: true,
          setting: {
            create: {
              timezone: CALENDAR_DEFAULTS.TIMEZONE,
              defaultReminderMinutes:
                CALENDAR_DEFAULTS.DEFAULT_REMINDER_MINUTES,
              defaultReminderMethod: ReminderMethod.ALERT,
            },
          },
        },
      });
    });
  }
}
