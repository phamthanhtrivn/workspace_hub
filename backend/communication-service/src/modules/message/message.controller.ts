import {
  Controller,
  Get,
  Post,
  Headers,
  Param,
  Query,
  BadRequestException,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageType } from '@prisma/client';
import {
  MESSAGE_DIRECTION,
  THREAD_FOLLOW_LABEL,
  MESSAGE_CONSTANTS,
  MESSAGE_SUCCESS_MESSAGES,
  MESSAGE_ERROR_MESSAGES,
} from './types/message.enums';

@Controller('api/channels')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post(':id/messages')
  async createMessage(
    @Param('id') channelId: string,
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
  ) {
    if (
      !channelId ||
      !userId ||
      (data.content === undefined &&
        (!data.medias || data.medias.length === 0) &&
        !data.pollData &&
        !data.noteData)
    ) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.messageService.createMessageAndPublish(
      channelId,
      userId,
      data.content || '',
      data.type || MessageType.TEXT,
      data.medias,
      data.pollData,
      data.noteData,
      data.threadParentId,
      data.mentions,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.CREATED,
      data: message,
    };
  }

  @Get('threads/followed')
  async getFollowedThreads(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    const threads = await this.messageService.getFollowedThreads(userId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREADS_LISTED,
      data: threads,
    };
  }

  @Get(':id/messages')
  async getConversationMessages(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: MESSAGE_DIRECTION,
  ) {
    if (!channelId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const messages = await this.messageService.getConversationMessages(
      channelId,
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
  async getConversationMedia(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('mediaType') mediaType?: string,
    @Query('q') q?: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const media = await this.messageService.getConversationMedia(
      channelId,
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
  async getPinnedMessages(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : MESSAGE_CONSTANTS.DEFAULT_LIMIT;
    const messages = await this.messageService.getPinnedMessages(
      channelId,
      cursor,
      parsedLimit,
      q,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.PINNED_RETRIEVED,
      data: messages,
    };
  }

  @Get(':id/messages/search')
  async searchConversationMessages(
    @Param('id') channelId: string,
    @Query('q') q?: string,
    @Query('senderId') senderId?: string,
    @Query('type') type?: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }
    const messages = await this.messageService.searchMessages(
      channelId,
      q,
      senderId,
      type,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.SEARCH_COMPLETED,
      data: messages,
    };
  }

  @Get('messages/:id/thread')
  async getThreadMessages(@Param('id') messageId: string) {
    if (!messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_MESSAGE_ID);
    }
    const result = await this.messageService.getThreadMessages(messageId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREAD_RETRIEVED,
      data: result,
    };
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('content') content: string,
  ) {
    if (!messageId || !userId || content === undefined) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.messageService.editMessageAndPublish(
      messageId,
      content,
      userId,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.UPDATED,
      data: message,
    };
  }

  @Patch('messages/:id/recall')
  async recallMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.messageService.recallMessageAndPublish(
      messageId,
      userId,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.RECALLED,
      data: message,
    };
  }

  @Post(':id/messages/read')
  async markConversationAsRead(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('messageId') messageId: string,
  ) {
    if (!channelId || !userId || !messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.messageService.markConversationAsReadAndPublish(
      channelId,
      userId,
      messageId,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.READ_RECEIPT_UPDATED,
      data: result,
    };
  }

  @Post('messages/:id/reactions')
  async addReaction(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    if (!messageId || !userId || !emoji) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.messageService.addReactionAndPublish(
      messageId,
      userId,
      emoji,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.REACTION_UPDATED,
      data: result,
    };
  }

  @Delete('messages/:id/reactions')
  async removeReaction(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    if (!messageId || !userId || !emoji) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const result = await this.messageService.removeReactionAndPublish(
      messageId,
      userId,
      emoji,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.REACTION_UPDATED,
      data: result,
    };
  }

  @Patch('messages/:id/pin')
  async pinMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.messageService.pinMessageAndPublish(
      messageId,
      userId,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.PINNED,
      data: message,
    };
  }

  @Patch('messages/:id/unpin')
  async unpinMessage(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!messageId || !userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.INVALID_DATA);
    }

    const message = await this.messageService.unpinMessageAndPublish(
      messageId,
      userId,
    );

    return {
      message: MESSAGE_SUCCESS_MESSAGES.UNPINNED,
      data: message,
    };
  }

  @Get('messages/:id/threads')
  async getConversationThreads(@Param('id') channelId: string) {
    if (!channelId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }
    const threads = await this.messageService.getConversationThreads(channelId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREADS_LISTED,
      data: threads,
    };
  }

  @Post('messages/:id/thread/follow')
  async followThread(
    @Headers('x-user-id') userId: string,
    @Param('id') messageId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_MESSAGE_ID);
    }
    const result = await this.messageService.followThread(userId, messageId);
    return {
      message: result.following
        ? THREAD_FOLLOW_LABEL.FOLLOWING
        : THREAD_FOLLOW_LABEL.UN_FOLLOWING,
      data: result,
    };
  }

  @Post('messages/:id/thread/unfollow')
  async unfollowThread(
    @Headers('x-user-id') userId: string,
    @Param('id') messageId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_MESSAGE_ID);
    }
    const result = await this.messageService.unfollowThread(userId, messageId);
    return {
      message: result.following
        ? THREAD_FOLLOW_LABEL.FOLLOWING
        : THREAD_FOLLOW_LABEL.UN_FOLLOWING,
      data: result,
    };
  }

  @Post('messages/:id/thread/read')
  async markThreadAsRead(
    @Headers('x-user-id') userId: string,
    @Param('id') messageId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!messageId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_MESSAGE_ID);
    }
    const result = await this.messageService.markThreadAsRead(
      userId,
      messageId,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.READ_RECEIPT_UPDATED,
      data: result,
    };
  }
}
