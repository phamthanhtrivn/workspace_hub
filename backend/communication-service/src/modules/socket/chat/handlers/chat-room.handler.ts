import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { DirectMessageService } from '../../../direct-message/direct-message.service';
import { MessageService } from '../../../message/message.service';
import { ChatEvent } from '../chat-socket.events';

@Injectable()
export class ChatRoomHandler {
  constructor(
    private readonly messageService: MessageService,
    private readonly directMessageService: DirectMessageService,
  ) {}

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
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.channelId) return;

    try {
      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.TYPING, {
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
        userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async handleDirectTyping(
    data: { conversationId: string; isTyping: boolean },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    try {
      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );
      const targetRooms = [data.conversationId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.TYPING, {
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      console.error(error);
    }
  }
}
