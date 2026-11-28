import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { socketUserId } from '../../../../common/auth/socket-user';
import { DirectMessagePermissionService } from '../../../direct-message/direct-message-permission.service';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { ChatSocketPublisher } from '../chat-socket.publisher';
import { ChannelAccessService } from '../../../channel/access/channel-access.service';

@Injectable()
export class ChatRoomHandler {
  constructor(
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly access: ChannelAccessService,
    private readonly directAccess: DirectMessagePermissionService,
  ) {}

  async handleJoinConversation(data: { channelId: string }, client: Socket) {
    if (data.channelId) {
      await this.access.assertPrivateAccess(
        data.channelId,
        socketUserId(client),
      );
      await client.join(data.channelId);
      return {
        status: CHAT_RESPONSE_STATUS.JOINED,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      };
    }
  }

  async handleJoinDirectConversation(
    data: { conversationId: string },
    client: Socket,
  ) {
    if (data.conversationId) {
      await this.directAccess.assertCanRead(
        data.conversationId,
        socketUserId(client) ?? '',
      );
      await client.join(data.conversationId);
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
    const userId = socketUserId(client);
    if (!userId || !data.channelId) return;

    try {
      await this.access.assertPrivateAccess(data.channelId, userId);
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
    const userId = socketUserId(client);
    if (!userId || !data.conversationId) return;

    try {
      await this.directAccess.assertCanRead(data.conversationId, userId);
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
