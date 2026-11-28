import { MeetingStatus, Prisma } from '@prisma/client';
import { HISTORY_MUTATION_LOCK_PREFIX } from '../types/meeting.constants';

export function meetingHistoryMutationWhere(
  userId: string,
  hidden: boolean,
): Prisma.MeetingWhereInput {
  return {
    participants: { some: { userId, joinedAt: { not: null } } },
    ...(hidden
      ? { status: { in: [MeetingStatus.ENDED, MeetingStatus.CANCELLED] } }
      : {}),
    historyPreferences: hidden
      ? { none: { userId, hiddenAt: { not: null } } }
      : { some: { userId, hiddenAt: { not: null } } },
  };
}

export async function lockMeetingHistory(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const key = `${HISTORY_MUTATION_LOCK_PREFIX}${userId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
