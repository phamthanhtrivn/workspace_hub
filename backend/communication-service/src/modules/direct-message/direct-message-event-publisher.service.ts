import { DirectMessageSocketPayload } from './types/direct-message-payload.types';
import { Injectable } from '@nestjs/common';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { DirectMessageQueryService } from './direct-message-query.service';

@Injectable()
export class DirectMessageEventPublisher {
  constructor(
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly queries: DirectMessageQueryService,
  ) {}
  async publishDirectReactionUpdated(
    messageId: string,
    userId: string,
    result: { action: string; emoji: string },
  ) {
    const conversationId =
      await this.queries.getDirectMessageConversationId(messageId);

    await this.chatSocketPublisher.publishDirectReactionUpdated(
      conversationId,
      {
        messageId,
        userId,
        emoji: result.emoji,
        action: result.action,
      },
    );
  }

  async publishDirectMessageUpdate(
    event: ChatEvent,
    message: DirectMessageSocketPayload,
  ) {
    const conversationId = this.getConversationIdFromMessage(message);
    await this.chatSocketPublisher.publishDirectMessageUpdated(
      conversationId,
      event,
      message,
    );
  }

  getConversationIdFromMessage(message: DirectMessageSocketPayload): string {
    if (typeof message.conversationId === 'string') {
      return message.conversationId;
    }

    if (typeof message.channelId === 'string') {
      return message.channelId;
    }

    throw new Error('Direct message payload is missing conversationId');
  }

  async publishDirectMessageCreated(
    conversationId: string,
    message: DirectMessageSocketPayload,
    data: {
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      threadParentId?: string;
      mentions?: string[];
    },
  ) {
    let threadFollowers: string[] = [];

    if (data.threadParentId) {
      threadFollowers = await this.queries.getDirectThreadFollowers(
        data.threadParentId,
      );
    }

    const messagePayload = {
      ...message,
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      mentions: data.mentions,
      threadFollowers: data.threadParentId ? threadFollowers : undefined,
    };

    await this.chatSocketPublisher.publishDirectMessageCreated(
      conversationId,
      messagePayload,
      { medias: data.medias },
    );
  }
}
