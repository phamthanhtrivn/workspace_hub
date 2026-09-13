import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Calendar, Prisma } from '@prisma/client';
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCalendars(tx, userId);
      const calendarCount = await tx.calendar.count({
        where: { ownerUserId: userId, projectId: null },
      });
      const shouldBeDefault = dto.isDefault === true || calendarCount === 0;

      if (shouldBeDefault) {
        await tx.calendar.updateMany({
          where: { ownerUserId: userId },
          data: { isDefault: false },
        });
      }

      return tx.calendar.create({
        data: {
          ownerUserId: userId,
          projectId: null,
          name: dto.name,
          icon: dto.icon === undefined ? CALENDAR_DEFAULTS.ICON : dto.icon,
          description: dto.description ?? null,
          color: dto.color ?? CALENDAR_DEFAULTS.COLOR,
          timeZone: dto.timeZone ?? CALENDAR_DEFAULTS.TIMEZONE,
          isDefault: shouldBeDefault,
          isVisible: dto.isVisible ?? true,
        },
      });
    });
  }

  async getUserCalendars(userId: string): Promise<Calendar[]> {
    await this.ensureDefaultCalendar(userId);

    return this.prisma.calendar.findMany({
      where: { ownerUserId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async updateCalendar(
    userId: string,
    calendarId: string,
    dto: UpdateCalendarDto,
  ): Promise<Calendar> {
    const calendar = await this.assertCalendarOwner(userId, calendarId);

    if (calendar.projectId) {
      if (
        dto.name !== undefined ||
        dto.icon !== undefined ||
        dto.description !== undefined ||
        dto.timeZone !== undefined ||
        dto.isDefault !== undefined
      ) {
        throw new ForbiddenException(
          CALENDAR_ERROR_MESSAGES.PROJECT_CALENDAR_READ_ONLY,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCalendars(tx, userId);
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
          color: updateData.color,
          timeZone: updateData.timeZone,
          isDefault:
            updateData.isDefault === false ? undefined : updateData.isDefault,
          isVisible: updateData.isVisible,
        },
      });
    });
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    const calendar = await this.assertCalendarOwner(userId, calendarId);

    if (calendar.projectId) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.PROJECT_CALENDAR_READ_ONLY,
      );
    }

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
      await this.lockUserCalendars(tx, userId);
      const defaultCalendar = await tx.calendar.findFirst({
        where: { ownerUserId: userId, projectId: null, isDefault: true },
      });

      if (defaultCalendar) return;
      await tx.calendar.updateMany({
        where: { ownerUserId: userId, isDefault: true },
        data: { isDefault: false },
      });

      const firstCalendar = await tx.calendar.findFirst({
        where: { ownerUserId: userId, projectId: null },
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
          projectId: null,
          name: CALENDAR_DEFAULTS.NAME,
          icon: CALENDAR_DEFAULTS.ICON,
          color: CALENDAR_DEFAULTS.COLOR,
          timeZone: CALENDAR_DEFAULTS.TIMEZONE,
          isDefault: true,
          isVisible: true,
        },
      });
    });
  }

  private async lockUserCalendars(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  }
}
