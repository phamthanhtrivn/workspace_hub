import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  forwardRef,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { CommunicationGateway } from '../socket/communication.gateway';
import {
  ChatEvent,
  CHAT_CONTEXT_TYPE,
  CHAT_REACTION_ACTION,
} from '../chat/chat.enums';
import { DirectMessageService } from './direct-message.service';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
  MESSAGE_ERROR_MESSAGES,
  MESSAGE_SUCCESS_MESSAGES,
} from '../message/types/message.enums';

@Controller('api/direct-conversations')
export class DirectMessageController {
  constructor(
    private readonly directMessageService: DirectMessageService,
    @Inject(forwardRef(() => CommunicationGateway))
    private readonly chatGateway: CommunicationGateway,
  ) {}

  @Post(':id/messages')
  async createDirectMessage(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body()
    data: {
      content?: string;
      type?: MessageType;
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      threadParentId?: string;
    },
  ) {
    if (
      !conversationId ||
      !userId ||
      (data.content === undefined && (!data.medias || data.medias.length === 0))
    ) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.createDirectMessage(
      conversationId,
      userId,
      data.content || '',
      data.type || MessageType.TEXT,
      data.medias,
      data.threadParentId,
    );

    await this.broadcastDirectMessageCreated(
      conversationId,
      userId,
      message,
      data,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.CREATED,
      data: message,
    };
  }

  @Get(':id/messages')
  async getDirectConversationMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: MESSAGE_DIRECTION,
  ) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const messages =
      await this.directMessageService.getDirectConversationMessages(
        conversationId,
        cursor,
        parsedLimit,
        direction,
      );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.HISTORY_RETRIEVED,
      data: messages,
    };
  }

  @Get(':id/media')
  async getDirectConversationMedia(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('mediaType') mediaType?: string,
    @Query('q') q?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const media = await this.directMessageService.getDirectConversationMedia(
      conversationId,
      cursor,
      parsedLimit,
      mediaType,
      q,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.MEDIA_RETRIEVED,
      data: media,
    };
  }

  @Get(':id/pinned-messages')
  async getDirectPinnedMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('senderId') senderId?: string,
    @Query('q') q?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const messages = await this.directMessageService.getDirectPinnedMessages(
      conversationId,
      cursor,
      parsedLimit,
      senderId,
      q,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.PINNED_RETRIEVED,
      data: messages,
    };
  }

  @Get(':id/messages/search')
  async searchDirectConversationMessages(
    @Param('id') conversationId: string,
    @Query('q') q?: string,
    @Query('senderId') senderId?: string,
    @Query('type') type?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const messages = await this.directMessageService.searchDirectMessages(
      conversationId,
      q,
      senderId,
      type,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.SEARCH_COMPLETED,
      data: messages,
    };
  }

  @Get('threads/followed')
  async getFollowedDirectThreads(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const threads =
      await this.directMessageService.getFollowedDirectThreads(userId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREADS_LISTED,
      data: threads,
    };
  }

  @Get(':id/threads')
  async getDirectConversationThreads(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('senderId') senderId?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const threads =
      await this.directMessageService.getDirectConversationThreads(
        conversationId,
        cursor,
        parsedLimit,
        senderId,
      );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREADS_LISTED,
      data: threads,
    };
  }

  @Get('messages/:id/thread')
  async getDirectThreadMessages(@Param('id') messageId: string) {
    if (!messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_MESSAGE_ID);
    }

    const result =
      await this.directMessageService.getDirectThreadMessages(messageId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREAD_RETRIEVED,
      data: result,
    };
  }

  @Post(':id/messages/read')
  async markDirectConversationAsRead(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body('messageId') messageId: string,
  ) {
    if (!conversationId || !userId || !messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.markDirectConversationAsRead(
      conversationId,
      userId,
      messageId,
    );
    const targetRooms = await this.getDirectTargetRooms(conversationId);
    this.chatGateway.server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      messageId,
      userId,
      readAt: result.lastReadAt,
    });

    return {
      message: MESSAGE_SUCCESS_MESSAGES.READ_RECEIPT_UPDATED,
      data: result,
    };
  }

  @Patch('messages/:id')
  async editDirectMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('content') content: string,
  ) {
    if (!messageId || !userId || content === undefined) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.editDirectMessage(
      messageId,
      content,
      userId,
    );
    await this.broadcastDirectMessageUpdate(ChatEvent.MESSAGE_UPDATED, message);

    return {
      message: MESSAGE_SUCCESS_MESSAGES.UPDATED,
      data: message,
    };
  }

  @Patch('messages/:id/recall')
  async recallDirectMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.recallDirectMessage(
      messageId,
      userId,
    );
    await this.broadcastDirectMessageUpdate(ChatEvent.MESSAGE_UPDATED, message);

    return {
      message: MESSAGE_SUCCESS_MESSAGES.RECALLED,
      data: message,
    };
  }

  @Delete('messages/:id')
  async deleteDirectMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.deleteDirectMessage(
      messageId,
      userId,
    );
    await this.broadcastDirectMessageUpdate(ChatEvent.MESSAGE_UPDATED, message);

    return {
      message: MESSAGE_SUCCESS_MESSAGES.DELETED,
      data: message,
    };
  }

  @Post('messages/:id/reactions')
  async addDirectReaction(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    if (!messageId || !userId || !emoji) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.addDirectReaction(
      messageId,
      userId,
      emoji,
    );
    const conversationId =
      await this.directMessageService.getDirectMessageConversationId(messageId);
    const targetRooms = await this.getDirectTargetRooms(conversationId);
    this.chatGateway.server.to(targetRooms).emit(ChatEvent.REACTION_UPDATED, {
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      messageId,
      userId,
      emoji: result.emoji,
      action: result.action,
    });

    return {
      message: MESSAGE_SUCCESS_MESSAGES.REACTION_UPDATED,
      data: result,
    };
  }

  @Delete('messages/:id/reactions')
  async removeDirectReaction(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    if (!messageId || !userId || !emoji) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.removeDirectReaction(
      messageId,
      userId,
      emoji,
    );
    const conversationId =
      await this.directMessageService.getDirectMessageConversationId(messageId);
    const targetRooms = await this.getDirectTargetRooms(conversationId);
    this.chatGateway.server.to(targetRooms).emit(ChatEvent.REACTION_UPDATED, {
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      messageId,
      userId,
      emoji,
      action: CHAT_REACTION_ACTION.REMOVE,
    });

    return {
      message: MESSAGE_SUCCESS_MESSAGES.REACTION_UPDATED,
      data: result,
    };
  }

  @Patch('messages/:id/pin')
  async pinDirectMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.pinDirectMessage(
      messageId,
      userId,
    );
    await this.broadcastDirectMessageUpdate(ChatEvent.MESSAGE_PINNED, message);

    return {
      message: MESSAGE_SUCCESS_MESSAGES.PINNED,
      data: message,
    };
  }

  @Patch('messages/:id/unpin')
  async unpinDirectMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.directMessageService.unpinDirectMessage(
      messageId,
      userId,
    );
    await this.broadcastDirectMessageUpdate(
      ChatEvent.MESSAGE_UNPINNED,
      message,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.UNPINNED,
      data: message,
    };
  }

  @Post('messages/:id/thread/follow')
  async followDirectThread(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.followDirectThread(
      messageId,
      userId,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREAD_FOLLOW_UPDATED,
      data: result,
    };
  }

  @Delete('messages/:id/thread/follow')
  async unfollowDirectThread(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.unfollowDirectThread(
      messageId,
      userId,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREAD_FOLLOW_UPDATED,
      data: result,
    };
  }

  @Post('messages/:id/thread/read')
  async markDirectThreadAsRead(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.directMessageService.markDirectThreadAsRead(
      messageId,
      userId,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.READ_RECEIPT_UPDATED,
      data: result,
    };
  }

  private async getDirectTargetRooms(conversationId: string) {
    const memberUserIds =
      await this.directMessageService.getDirectConversationMemberIds(
        conversationId,
      );
    return [conversationId, ...memberUserIds];
  }

  private async broadcastDirectMessageUpdate(event: ChatEvent, message: any) {
    const conversationId = message.conversationId ?? message.channelId;
    const targetRooms = await this.getDirectTargetRooms(conversationId);
    this.chatGateway.server.to(targetRooms).emit(event, {
      ...message,
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
    });
  }

  private async broadcastDirectMessageCreated(
    conversationId: string,
    senderId: string,
    message: any,
    data: {
      content?: string;
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
  ) {
    const targetRooms = await this.getDirectTargetRooms(conversationId);
    let threadFollowers: string[] = [];

    if (data.threadParentId) {
      threadFollowers =
        await this.directMessageService.getDirectThreadFollowers(
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

    this.chatGateway.server
      .to(targetRooms)
      .emit(ChatEvent.NEW_MESSAGE, messagePayload);

    if (data.medias && data.medias.length > 0) {
      this.chatGateway.server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
        chatId: conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId,
        messageId: message.id,
        media: messagePayload.medias,
      });
    }
  }
}
