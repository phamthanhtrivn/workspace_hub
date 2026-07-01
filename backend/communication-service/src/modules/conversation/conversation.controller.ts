import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';

@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('direct')
  async createDirectConversation(
    @Headers('x-user-id') userId: string,
    @Body() createDirectDto: CreateDirectConversationDto,
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }

    const conversation =
      await this.conversationService.createDirectConversation(
        userId,
        createDirectDto.participantId,
      );

    return {
      message: 'Cuộc trò chuyện được tạo thành công',
      data: conversation,
    };
  }

  @Get()
  async getUserConversations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }

    const conversations = await this.conversationService.getUserConversations(userId);

    return {
      message: 'Lấy danh sách cuộc trò chuyện thành công',
      data: conversations,
    };
  }

  @Get(':id/messages')
  async getConversationMessages(@Param('id') conversationId: string) {
    if (!conversationId) {
      throw new BadRequestException('Thiếu conversationId');
    }
    const messages = await this.conversationService.getConversationMessages(conversationId);
    return {
      message: 'Lấy lịch sử tin nhắn thành công',
      data: messages,
    };
  }
}
