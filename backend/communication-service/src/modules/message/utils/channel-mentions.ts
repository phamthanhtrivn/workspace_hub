import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { findAuthoredMentions } from '../../../common/utils/message-mention.utils';
import { MESSAGE_ERROR_MESSAGES } from '../types/message.enums';

export const CHANNEL_GROUP_MENTION = {
  all: { id: 'all', label: '@All' },
  channel: { id: 'channel', label: '@Channel' },
} as const;

const GROUP_MENTION_PATTERN =
  /(^|[\s([{"'.,!?;:])(@(?:all|channel))(?![\p{L}\p{N}_-])/giu;

export interface ChannelMentionScope {
  id: string;
  spaceId: string;
  isDefault: boolean;
}

export interface ResolvedChannelMentions {
  content: string;
  mentions: string[];
}

/** Resolve inside the message transaction, using current membership rather than client group IDs. */
export async function resolveChannelMentions(
  tx: Prisma.TransactionClient,
  channel: ChannelMentionScope,
  senderId: string,
  content: string,
  mentions?: string[],
): Promise<ResolvedChannelMentions> {
  if (
    mentions !== undefined &&
    (!Array.isArray(mentions) ||
      mentions.some((mention) => typeof mention !== 'string'))
  ) {
    throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
  }
  const groupMentions = findAuthoredMentions(content, GROUP_MENTION_PATTERN);
  const canonical = channel.isDefault
    ? CHANNEL_GROUP_MENTION.all
    : CHANNEL_GROUP_MENTION.channel;
  const parts: string[] = [];
  let cursor = 0;
  for (const mention of groupMentions) {
    parts.push(content.slice(cursor, mention.start), canonical.label);
    cursor = mention.end;
  }
  parts.push(content.slice(cursor));
  const normalizedContent = parts.join('');
  const requestedUsers = [
    ...new Set(
      (mentions ?? []).filter(
        (mention) => isUUID(mention) && mention !== senderId,
      ),
    ),
  ];
  if (!groupMentions.length && !requestedUsers.length)
    return { content: normalizedContent, mentions: [] };

  const spaceMembers = await tx.spaceMember.findMany({
    where: {
      spaceId: channel.spaceId,
      userId: {
        not: senderId,
        ...(!groupMentions.length ? { in: requestedUsers } : {}),
      },
    },
    select: { userId: true },
  });
  const spaceUsers = spaceMembers.map((member) => member.userId);
  // General reaches accepted Space members; every other channel stays within
  // both its own membership and the current Space membership (including private channels).
  if (channel.isDefault && groupMentions.length) {
    return { content: normalizedContent, mentions: [...new Set(spaceUsers)] };
  }
  const channelMembers = await tx.channelMember.findMany({
    where: { channelId: channel.id, userId: { in: spaceUsers } },
    select: { userId: true },
  });
  const requested = new Set(requestedUsers);
  const recipients = channelMembers
    .filter((member) => groupMentions.length || requested.has(member.userId))
    .map((member) => member.userId);

  return { content: normalizedContent, mentions: [...new Set(recipients)] };
}
