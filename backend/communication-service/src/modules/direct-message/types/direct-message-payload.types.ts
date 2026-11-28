import { Prisma } from '@prisma/client';

export type DirectMessageWithMedia = Prisma.DirectMessageGetPayload<{
  include: { medias: true };
}> &
  Record<string, unknown>;

export type DirectMessageSocketPayload = Record<string, unknown> & {
  id: string;
  medias?: unknown[];
} & (
    | { conversationId: string; channelId?: string | null }
    | { channelId: string; conversationId?: string | null }
  );
