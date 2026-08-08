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
import { MESSAGE_DIRECTION, THREAD_FOLLOW_LABEL } from './types/message.enums';

@Controller('api/channels')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get(':id/messages')
  async getConversationMessages(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: MESSAGE_DIRECTION,
  ) {
    if (!channelId) {
      throw new BadRequestException('Thiếu channelId');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const messages = await this.messageService.getConversationMessages(
      channelId,
      cursor,
      parsedLimit,
      direction,
    );
    return {
      message: 'Lấy lịch sử tin nhắn thành công',
      data: messages,
    };
  }

  @Get(':id/media')
  async getConversationMedia(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!channelId) {
      throw new BadRequestException('Thiếu channelId');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const media = await this.messageService.getConversationMedia(
      channelId,
      cursor,
      parsedLimit,
    );
    return {
      message: 'Lấy dữ liệu media thành công',
      data: media,
    };
  }

  @Get(':id/pinned-messages')
  async getPinnedMessages(@Param('id') channelId: string) {
    if (!channelId) {
      throw new BadRequestException('Thiếu channelId');
    }
    const messages = await this.messageService.getPinnedMessages(channelId);
    return {
      message: 'Lấy danh sách tin nhắn ghim thành công',
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
      throw new BadRequestException('Thiếu channelId');
    }
    const messages = await this.messageService.searchMessages(
      channelId,
      q,
      senderId,
      type,
    );
    return {
      message: 'Tìm kiếm tin nhắn thành công',
      data: messages,
    };
  }

  @Get('messages/:id/thread')
  async getThreadMessages(@Param('id') messageId: string) {
    if (!messageId) {
      throw new BadRequestException('Thiếu messageId');
    }
    const result = await this.messageService.getThreadMessages(messageId);
    return {
      message: 'Lấy tin nhắn trong luồng thành công',
      data: result,
    };
  }

  @Get('messages/:id/threads')
  async getConversationThreads(@Param('id') channelId: string) {
    if (!channelId) {
      throw new BadRequestException('Thiếu channelId');
    }
    const threads = await this.messageService.getConversationThreads(channelId);
    return {
      message: 'Lấy danh sách các luồng thành công',
      data: threads,
    };
  }

  @Post('messages/:id/thread/follow')
  async followThread(
    @Headers('x-user-id') userId: string,
    @Param('id') messageId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    if (!messageId) {
      throw new BadRequestException('Thiếu messageId');
    }
    const result = await this.messageService.toggleFollowThread(
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
      throw new BadRequestException('Thiếu userId');
    }
    if (!messageId) {
      throw new BadRequestException('Thiếu messageId');
    }
    const result = await this.messageService.toggleFollowThread(
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
}
