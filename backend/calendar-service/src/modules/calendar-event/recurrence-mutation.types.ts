import { Prisma } from '@prisma/client';
export type MutationEffect = (
  tx: Prisma.TransactionClient,
  eventId: string,
) => Promise<void>;
