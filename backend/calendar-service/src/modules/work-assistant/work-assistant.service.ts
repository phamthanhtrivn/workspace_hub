import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CalendarContextDto } from './work-assistant.controller';

@Injectable()
export class WorkAssistantService {
  constructor(private readonly prisma: PrismaService) {}
  async context(input: CalendarContextDto) {
    const from = new Date(input.from),
      to = new Date(input.to);
    const windowStart = new Date(input.windowStart),
      windowEnd = new Date(input.windowEnd);
    if (
      !(to > from) ||
      to.getTime() - from.getTime() > 32 * 86400000 ||
      !(windowEnd > windowStart) ||
      windowEnd.getTime() - windowStart.getTime() > 8 * 86400000
    )
      throw new BadRequestException('Invalid period');
    const personal: Prisma.CalendarEventWhereInput = {
      calendar: { projectId: null, ownerUserId: input.userId },
      status: { not: 'CANCELLED' },
      OR: [
        { sourceType: 'TASK', sourceId: null },
        { sourceType: 'USER', description: { contains: '[TASK]' } },
      ],
    };
    const focusWhere: Prisma.PomodoroSessionWhereInput = {
      userId: input.userId,
      sessionType: 'FOCUS',
      status: { in: ['COMPLETED', 'STOPPED'] },
      startedAt: { gte: from, lt: to },
      ...(input.projectId ? { projectId: input.projectId } : {}),
    };
    const [
      calendar,
      busy,
      recurring,
      tasks,
      completed,
      pending,
      focus,
      perTask,
    ] = await Promise.all([
      this.prisma.calendar.findFirst({
        where: { ownerUserId: input.userId, isDefault: true },
        select: { timeZone: true },
      }),
      // No event titles, descriptions, attendee identities or attachments leave this service.
      this.prisma.calendarEvent.findMany({
        where: {
          status: { not: 'CANCELLED' },
          startAt: { lt: windowEnd },
          endAt: { gt: windowStart },
          sourceType: 'USER',
          AND: [
            {
              OR: [
                { description: null },
                { NOT: { description: { contains: '[TASK]' } } },
              ],
            },
          ],
          OR: [
            { calendar: { ownerUserId: input.userId, projectId: null } },
            {
              attendees: {
                some: {
                  userId: input.userId,
                  responseStatus: { not: 'DECLINED' },
                },
              },
            },
          ],
        },
        take: 2001,
        select: { startAt: true, endAt: true },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.recurrenceSeries.count({
        where: {
          status: { not: 'CANCELLED' },
          startAt: { lt: windowEnd },
          AND: [
            {
              OR: [
                { calendar: { ownerUserId: input.userId } },
                { attendees: { some: { userId: input.userId } } },
              ],
            },
            {
              OR: [
                { recurrenceGeneratedUntil: null },
                { recurrenceGeneratedUntil: { lt: windowEnd } },
              ],
            },
          ],
        },
      }),
      this.prisma.calendarEvent.findMany({
        where: { ...personal, completedAt: null },
        take: 61,
        orderBy: [{ endAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          endAt: true,
          allDay: true,
        },
      }),
      this.prisma.calendarEvent.findMany({
        where: { ...personal, completedAt: { gte: from, lt: to } },
        select: { endAt: true, completedAt: true },
      }),
      this.prisma.calendarEvent.aggregate({
        where: { ...personal, completedAt: null },
        _count: { _all: true },
      }),
      this.prisma.pomodoroSession.aggregate({
        where: focusWhere,
        _count: { _all: true },
        _sum: { actualSeconds: true },
      }),
      this.prisma.pomodoroSession.groupBy({
        by: ['taskId', 'eventId'],
        where: focusWhere,
        _sum: { actualSeconds: true },
        _count: { _all: true },
        orderBy: { _sum: { actualSeconds: 'desc' } },
        take: 60,
      }),
    ]);
    const now = new Date();
    const [overdue, dueToday] = await Promise.all([
      this.prisma.calendarEvent.count({
        where: { ...personal, completedAt: null, endAt: { lt: now } },
      }),
      this.prisma.calendarEvent.count({
        where: {
          ...personal,
          completedAt: null,
          AND: [
            {
              OR: [
                {
                  allDay: false,
                  endAt: { gte: windowStart, lt: new Date(input.todayEnd) },
                },
                {
                  allDay: true,
                  endAt: { gt: windowStart, lte: new Date(input.todayEnd) },
                },
              ],
            },
          ],
        },
      }),
    ]);
    const onTime = completed.filter(
      (t) => t.completedAt && t.completedAt <= t.endAt,
    ).length;
    return {
      available: true,
      timeZone: calendar?.timeZone ?? 'Asia/Ho_Chi_Minh',
      partial: tasks.length > 60,
      busyPartial: busy.length > 2000 || recurring > 0,
      busy: busy
        .slice(0, 2000)
        .map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
      tasks: tasks.slice(0, 60).map((t) => ({
        id: t.id,
        kind: 'calendar',
        title: t.title.slice(0, 200),
        description: t.description?.slice(0, 800) ?? null,
        startAt: t.startAt,
        dueAt: t.endAt,
        allDay: t.allDay,
        status: 'TODO',
        priority: 'MEDIUM',
        overdue: t.endAt < now,
        dueToday: t.allDay
          ? t.endAt > windowStart && t.endAt <= new Date(input.todayEnd)
          : t.endAt >= windowStart && t.endAt < new Date(input.todayEnd),
        blockedBy: [],
        unblocks: 0,
        checklist: [],
        childCount: 0,
        checklistCount: 0,
        url: '/calendar?eventId=' + t.id + '&t=' + t.startAt.getTime(),
      })),
      metrics: {
        open: pending._count._all,
        overdue,
        dueToday,
        completedInPeriod: completed.length,
        completedWithDeadline: completed.length,
        onTime,
        late: completed.length - onTime,
        onTimeRate: completed.length ? onTime / completed.length : null,
        deadlineBasis: 'current stored deadline',
      },
      focus: {
        seconds: focus._sum.actualSeconds ?? 0,
        sessions: focus._count._all,
        perTask: perTask.map((p) => ({
          taskId: p.taskId,
          eventId: p.eventId,
          seconds: p._sum.actualSeconds ?? 0,
          sessions: p._count._all,
        })),
      },
    };
  }
}
