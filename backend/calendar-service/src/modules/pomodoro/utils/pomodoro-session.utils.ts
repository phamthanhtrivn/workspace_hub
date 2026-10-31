import { BadRequestException } from '@nestjs/common';
import { PomodoroSession, PomodoroSessionStatus } from '@prisma/client';
import { DAY_MS } from '../constants/pomodoro.constants';
export function withDurationMinutes(session: PomodoroSession) {
  return {
    ...session,
    durationMinutes: Math.round(
      (session.status === PomodoroSessionStatus.COMPLETED
        ? session.plannedSeconds
        : session.actualSeconds) / 60,
    ),
  };
}

export function dateInTimeZone(timeZone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new BadRequestException('Invalid time zone');
  }
  return (instant: Date) => {
    const parts = formatter.formatToParts(instant);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
}

export function searchWindow(date: string) {
  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(midnight.getTime()) ||
    midnight.toISOString().slice(0, 10) !== date
  ) {
    throw new BadRequestException('Invalid date');
  }
  return {
    startAt: new Date(midnight.getTime() - DAY_MS),
    endAt: new Date(midnight.getTime() + 2 * DAY_MS),
    midnight,
  };
}
