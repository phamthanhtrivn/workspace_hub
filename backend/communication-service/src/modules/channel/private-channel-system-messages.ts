import { Message, MessageType, Prisma } from '@prisma/client';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import {
  PrivateChannelMembershipEvent,
  PRIVATE_CHANNEL_SYSTEM_MESSAGE_TEXT,
} from './types/private-channel-system-message.types';

// Persist with the membership mutation, never in a second transaction.
export async function createPrivateChannelSystemMessages(
  tx: Prisma.TransactionClient,
  channelId: string,
  actorId: string,
  events: PrivateChannelMembershipEvent[],
): Promise<Message[]> {
  if (!events.length) return [];
  const profiles = await tx.userProfileSnapshot.findMany({
    where: {
      userId: {
        in: [...new Set([actorId, ...events.map((event) => event.userId)])],
      },
    },
    select: { userId: true, fullName: true, email: true },
  });
  const displayNames = new Map(
    profiles.map((profile) => [
      profile.userId,
      profile.fullName || profile.email || profile.userId,
    ]),
  );
  const name = (userId: string) => displayNames.get(userId) || userId;
  const messages: Message[] = [];
  for (const event of events) {
    messages.push(
      await tx.message.create({
        data: {
          channelId,
          senderId: actorId,
          type: MessageType.SYSTEM,
          content: PRIVATE_CHANNEL_SYSTEM_MESSAGE_TEXT[event.action](
            name(actorId),
            name(event.userId),
          ),
        },
      }),
    );
  }
  await tx.channel.update({
    where: { id: channelId },
    data: { updatedAt: new Date() },
  });
  return messages;
}

// User rooms only: a removed member must not receive later channel messages.
export function publishPrivateChannelSystemMessages(
  publisher: ChatSocketPublisher,
  messages: Message[],
  memberUserIds: string[],
) {
  for (const message of messages) {
    publisher.publishToRooms(memberUserIds, ChatEvent.NEW_MESSAGE, {
      ...message,
      chatId: message.channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      medias: [],
      reactions: [],
      poll: null,
      note: null,
      senderProfile: null,
    });
  }
}
