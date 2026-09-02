import { Prisma } from '@prisma/client';

export const eventWithRelationsInclude = {
  calendar: true,
  attendees: { orderBy: { createdAt: 'asc' as const } },
  reminders: { orderBy: { minutesBefore: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  recurrenceSeries: {
    include: {
      exceptions: { orderBy: { occurrenceStart: 'asc' as const } },
      attendees: true,
      reminders: true,
      documents: true,
    },
  },
} satisfies Prisma.CalendarEventInclude;

export type EventWithRelations = Prisma.CalendarEventGetPayload<{
  include: typeof eventWithRelationsInclude;
}>;
