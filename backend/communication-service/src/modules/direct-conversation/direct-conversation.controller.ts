import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { CHANNEL_ERROR_MESSAGES, CHANNEL_SUCCESS_MESSAGES } from '../channel/types/channel.enums';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { DirectConversationService } from './direct-conversation.service';

@Controller('api/direct-conversations')
export class DirectConversationController {
  constructor(
    private readonly directConversationService: DirectConversationService,
  ) {}

  @Post()
  async createDirectConversation(
    @Headers('x-user-id') userId: string,
    @Body() createDirectDto: CreateDirectConversationDto,
  ) {
    if (!userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const conversation =
      await this.directConversationService.createDirectConversation(
        userId,
        createDirectDto.participantId,
      );

    return {
      message: CHANNEL_SUCCESS_MESSAGES.CREATED,
      data: conversation,
    };
  }

  @Get()
  async getDirectConversations(
    @Headers('x-user-id') userId: string,
    @Query('search') search?: string,
  ) {
    if (!userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const conversations =
      await this.directConversationService.getUserDirectConversations(
        userId,
        search,
      );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.LISTED,
      data: conversations,
    };
  }

  @Patch(':id/mute')
  async muteDirectConversation(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body('muted') muted: boolean,
  ) {
    if (!userId || !conversationId || muted === undefined) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }

    const result = await this.directConversationService.muteDirectConversation(
      conversationId,
      userId,
      muted,
    );

    return {
      message: muted
        ? CHANNEL_SUCCESS_MESSAGES.MUTE_ON
        : CHANNEL_SUCCESS_MESSAGES.MUTE_OFF,
      data: result,
    };
  }

  @Patch(':id/pin')
  async pinDirectConversation(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body('pinned') pinned: boolean,
  ) {
    if (!userId || !conversationId || pinned === undefined) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }

    const result = await this.directConversationService.pinDirectConversation(
      conversationId,
      userId,
      pinned,
    );

    return {
      message: pinned ? 'Direct conversation pinned' : 'Direct conversation unpinned',
      data: result,
    };
  }
}
