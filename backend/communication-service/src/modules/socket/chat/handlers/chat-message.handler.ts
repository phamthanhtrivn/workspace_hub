import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_ERROR_MESSAGES,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { MessageService } from '../../../message/message.service';
import { DirectMessageService } from '../../../direct-message/direct-message.service';
import { mapMediaWithUrl } from '../../../../common/utils/file.util';
import { ChatEvent } from '../chat-socket.events';

@Injectable()
export class ChatMessageHandler {
  constructor(
    private readonly messageService: MessageService,
    private readonly directMessageService: DirectMessageService,
  ) {}

  async handleSendMessage(
    data: {
      channelId: string;
      content: string;
      type?: MessageType;
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      pollData?: {
        title: string;
        multipleChoice?: boolean;
        allowAddOptions?: boolean;
        anonymous?: boolean;
        options: string[];
      };
      noteData?: {
        title: string;
        content: string;
      };
      threadParentId?: string;
      mentions?: string[];
    },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (
      !userId ||
      !data.channelId ||
      (data.content === undefined &&
        (!data.medias || data.medias.length === 0) &&
        !data.pollData &&
        !data.noteData)
    ) {
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.INVALID_DATA,
      };
    }

    try {
      const message = await this.messageService.createMessage(
        data.channelId,
        userId,
        data.content || '',
        data.type || MessageType.TEXT,
        data.medias,
        data.pollData,
        data.noteData,
        data.threadParentId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );

      let threadFollowers: string[] = [];
      if (data.threadParentId) {
        threadFollowers = await this.messageService.getThreadFollowers(
          data.threadParentId,
        );
      }

      const messageWithUrls = {
        ...message,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        medias: mapMediaWithUrl(message.medias),
        mentions: data.mentions,
        threadFollowers: data.threadParentId ? threadFollowers : undefined,
      };

      const targetRooms = [data.channelId, ...memberUserIds];
      server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);

      if (data.medias && data.medias.length > 0) {
        server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          media: messageWithUrls.medias,
        });
      }

      if (data.pollData && messageWithUrls.poll) {
        server.to(targetRooms).emit(ChatEvent.POLL_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          poll: messageWithUrls.poll,
        });
      }

      if (data.noteData && messageWithUrls.note) {
        server.to(targetRooms).emit(ChatEvent.NOTE_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          note: messageWithUrls.note,
        });
      }

      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SEND_FAILED,
      };
    }
  }

  async handleSendDirectMessage(
    data: {
      conversationId: string;
      content: string;
      type?: MessageType;
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      threadParentId?: string;
      mentions?: string[];
    },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (
      !userId ||
      !data.conversationId ||
      (data.content === undefined && (!data.medias || data.medias.length === 0))
    ) {
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.INVALID_DATA,
      };
    }

    try {
      const message = await this.directMessageService.createDirectMessage(
        data.conversationId,
        userId,
        data.content || '',
        data.type || MessageType.TEXT,
        data.medias,
        data.threadParentId,
      );

      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );

      let threadFollowers: string[] = [];
      if (data.threadParentId) {
        threadFollowers =
          await this.directMessageService.getDirectThreadFollowers(
            data.threadParentId,
          );
      }

      const messageWithUrls = {
        ...message,
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        medias: mapMediaWithUrl(message.medias),
        mentions: data.mentions,
        threadFollowers: data.threadParentId ? threadFollowers : undefined,
      };

      const targetRooms = [data.conversationId, ...memberUserIds];
      server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);

      if (data.medias && data.medias.length > 0) {
        server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
          chatId: data.conversationId,
          chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
          conversationId: data.conversationId,
          messageId: message.id,
          media: messageWithUrls.medias,
        });
      }

      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SEND_FAILED,
      };
    }
  }

  async sendSystemMessage(
    channelId: string,
    userId: string,
    content: string,
    server: Server,
  ) {
    try {
      const message = await this.messageService.createMessage(
        channelId,
        userId,
        content,
        MessageType.SYSTEM,
      );

      const memberUserIds =
        await this.messageService.getConversationMemberIds(channelId);

      const messageWithUrls = {
        ...message,
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        medias: [],
      };

      const targetRooms = [channelId, ...memberUserIds];
      server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SYSTEM_SEND_FAILED,
      };
    }
  }

  async handleEditMessage(
    data: { channelId: string; messageId: string; content: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (
      !userId ||
      !data.messageId ||
      !data.channelId ||
      data.content === undefined
    )
      return;

    try {
      const updatedMessage = await this.messageService.editMessage(
        data.messageId,
        data.content,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.MESSAGE_EDIT_FAILED,
      };
    }
  }

  async handleRecallMessage(
    data: { channelId: string; messageId: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.recallMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.MESSAGE_RECALL_FAILED,
      };
    }
  }

  async handleReadMessage(
    data: { channelId: string; messageId: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const readReceipt = await this.messageService.markConversationAsRead(
        data.channelId,
        userId,
        data.messageId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
        messageId: data.messageId,
        userId,
        readAt: readReceipt.lastReadAt,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.READ_RECEIPT_FAILED,
      };
    }
  }

  async handleReadDirectMessage(
    data: { conversationId: string; messageId: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId) return;

    try {
      const readReceipt =
        await this.directMessageService.markDirectConversationAsRead(
          data.conversationId,
          userId,
          data.messageId,
        );

      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );
      const targetRooms = [data.conversationId, ...memberUserIds];

      server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId,
        readAt: readReceipt.lastReadAt,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.READ_RECEIPT_FAILED,
      };
    }
  }

  async handlePinMessage(
    data: { channelId: string; messageId: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.pinMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      server.to(targetRooms).emit(ChatEvent.MESSAGE_PINNED, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: error.message || CHAT_ERROR_MESSAGES.PIN_FAILED,
      };
    }
  }

  async handleUnpinMessage(
    data: { channelId: string; messageId: string },
    client: Socket,
    server: Server,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.unpinMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      server.to(targetRooms).emit(ChatEvent.MESSAGE_UNPINNED, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: error.message || CHAT_ERROR_MESSAGES.UNPIN_FAILED,
      };
    }
  }
}
