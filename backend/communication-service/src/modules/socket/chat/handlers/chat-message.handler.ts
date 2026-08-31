import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { Socket } from 'socket.io';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_ERROR_MESSAGES,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { MessageService } from '../../../message/message.service';
import { DirectMessageService } from '../../../direct-message/direct-message.service';
import { mapMediaWithUrl } from '../../../../common/utils/file.util';
import { ChatSocketPublisher } from '../chat-socket.publisher';

@Injectable()
export class ChatMessageHandler {
  constructor(
    private readonly messageService: MessageService,
    private readonly directMessageService: DirectMessageService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
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

      await this.chatSocketPublisher.publishChannelMessageCreated(
        data.channelId,
        messageWithUrls,
        {
          medias: data.medias,
          pollData: data.pollData,
          noteData: data.noteData,
        },
      );

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
        data.mentions,
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
  ) {
    try {
      const messageWithUrls = await this.chatSocketPublisher.sendSystemMessage(
        channelId,
        userId,
        content,
      );
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

      await this.chatSocketPublisher.publishChannelMessageUpdated(
        data.channelId,
        updatedMessage,
      );
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
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.recallMessage(
        data.messageId,
        userId,
      );

      await this.chatSocketPublisher.publishChannelMessageUpdated(
        data.channelId,
        updatedMessage,
      );
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
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const readReceipt = await this.messageService.markConversationAsRead(
        data.channelId,
        userId,
        data.messageId,
      );

      await this.chatSocketPublisher.publishChannelMessageRead(
        data.channelId,
        {
          messageId: data.messageId,
          userId,
          readAt: readReceipt.lastReadAt,
        },
      );
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
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId) return;

    try {
      await this.directMessageService.markDirectConversationAsRead(
        data.conversationId,
        userId,
        data.messageId,
      );

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
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.pinMessage(
        data.messageId,
        userId,
      );

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      await this.chatSocketPublisher.publishChannelMessagePinned(
        data.channelId,
        messageWithUrls,
      );
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
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.unpinMessage(
        data.messageId,
        userId,
      );

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      await this.chatSocketPublisher.publishChannelMessageUnpinned(
        data.channelId,
        messageWithUrls,
      );
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
