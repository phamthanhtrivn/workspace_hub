import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
  MESSAGE_ERROR_MESSAGES,
  MESSAGE_SUCCESS_MESSAGES,
} from '../message/types/message.enums';

@Controller('api/direct-conversations')
export class DirectMessageController {
  constructor(private readonly directMessageService: DirectMessageService) {}

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

  @Get(':id/threads')
  async getDirectConversationThreads(@Param('id') conversationId: string) {
    if (!conversationId) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.MISSING_CHANNEL_ID);
    }

    const threads =
      await this.directMessageService.getDirectConversationThreads(
        conversationId,
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

    const result = await this.directMessageService.getDirectThreadMessages(
      messageId,
    );
    return {
      message: MESSAGE_SUCCESS_MESSAGES.THREAD_RETRIEVED,
      data: result,
    };
  }
}
