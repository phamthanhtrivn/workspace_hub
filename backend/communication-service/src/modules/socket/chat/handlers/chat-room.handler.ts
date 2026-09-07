import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { ChatSocketPublisher } from '../chat-socket.publisher';

@Injectable()
export class ChatRoomHandler {
  constructor(private readonly chatSocketPublisher: ChatSocketPublisher) {}

  handleJoinConversation(data: { channelId: string }, client: Socket) {
    if (data.channelId) {
      client.join(data.channelId);
      return {
        status: CHAT_RESPONSE_STATUS.JOINED,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      };
    }
  }

  handleJoinDirectConversation(
    data: { conversationId: string },
    client: Socket,
  ) {
    if (data.conversationId) {
      client.join(data.conversationId);
      return {
        status: CHAT_RESPONSE_STATUS.JOINED,
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId: data.conversationId,
      };
    }
  }

  async handleTyping(
    data: { channelId: string; isTyping: boolean },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.channelId) return;

    try {
      await this.chatSocketPublisher.publishTyping(
        CHAT_CONTEXT_TYPE.CHANNEL,
        data.channelId,
        {
          userId,
          isTyping: data.isTyping,
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  async handleDirectTyping(
    data: { conversationId: string; isTyping: boolean },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    try {
      await this.chatSocketPublisher.publishTyping(
        CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        data.conversationId,
        {
          userId,
          isTyping: data.isTyping,
        },
      );
    } catch (error) {
      console.error(error);
    }
  }
}
