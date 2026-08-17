import {
  Controller,
  Get,
  Post,
  Headers,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MessageService } from './message.service';
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
    const result = await this.messageService.followThread(
      userId,
      messageId,
    );
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
    const result = await this.messageService.unfollowThread(
      userId,
      messageId,
    );
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
    const result = await this.messageService.markThreadAsRead(userId, messageId);
    return {
      message: MESSAGE_SUCCESS_MESSAGES.READ_RECEIPT_UPDATED,
      data: result,
    };
  }
}
