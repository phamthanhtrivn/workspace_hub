import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  BadRequestException,
  Query,
  Patch,
  Put,
  Delete,
} from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { CreateDirectConversationDto } from '../dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from '../dto/create-group-conversation.dto';
import { UpdateConversationSettingDto } from '../dto/update-conversation-setting.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';

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

  @Post('group')
  async createGroupConversation(
    @Headers('x-user-id') userId: string,
    @Body() createGroupDto: CreateGroupConversationDto,
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    if (
      !createGroupDto.participantIds ||
      createGroupDto.participantIds.length === 0
    ) {
      throw new BadRequestException(
        'Phải có ít nhất một thành viên khác trong nhóm',
      );
    }

    const conversation = await this.conversationService.createGroupConversation(
      userId,
      createGroupDto,
    );

    return {
      message: 'Nhóm trò chuyện được tạo thành công',
      data: conversation,
    };
  }

  @Get()
  async getUserConversations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }

    const conversations =
      await this.conversationService.getUserConversations(userId);

    return {
      message: 'Lấy danh sách cuộc trò chuyện thành công',
      data: conversations,
    };
  }

  @Get(':id/messages')
  async getConversationMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: 'older' | 'newer' | 'around',
  ) {
    if (!conversationId) {
      throw new BadRequestException('Thiếu conversationId');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const messages = await this.conversationService.getConversationMessages(
      conversationId,
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
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException('Thiếu conversationId');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const media = await this.conversationService.getConversationMedia(
      conversationId,
      cursor,
      parsedLimit,
    );
    return {
      message: 'Lấy dữ liệu media thành công',
      data: media,
    };
  }

  @Get(':id/pinned-messages')
  async getPinnedMessages(@Param('id') conversationId: string) {
    if (!conversationId) {
      throw new BadRequestException('Thiếu conversationId');
    }
    const messages = await this.conversationService.getPinnedMessages(conversationId);
    return {
      message: 'Lấy danh sách tin nhắn ghim thành công',
      data: messages,
    };
  }

  @Get(':id/messages/search')
  async searchConversationMessages(
    @Param('id') conversationId: string,
    @Query('q') q?: string,
    @Query('senderId') senderId?: string,
    @Query('type') type?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException('Thiếu conversationId');
    }
    const messages = await this.conversationService.searchMessages(
      conversationId,
      q,
      senderId,
      type,
    );
    return {
      message: 'Tìm kiếm tin nhắn thành công',
      data: messages,
    };
  }

  @Patch(':id/settings')
  async updateConversationSettings(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body() updateSettingDto: UpdateConversationSettingDto,
  ) {
    if (!userId || !conversationId) {
      throw new BadRequestException('Thiếu userId hoặc conversationId');
    }
    const result = await this.conversationService.updateConversationSettings(
      conversationId,
      userId,
      updateSettingDto,
    );
    return {
      message: 'Cập nhật cài đặt nhóm thành công',
      data: result,
    };
  }

  @Put(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
    @Headers('x-user-id') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ) {
    if (!userId || !conversationId || !memberId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.updateMemberRole(
      conversationId,
      userId,
      memberId,
      updateRoleDto.role,
    );
    return {
      message: 'Cập nhật vai trò thành công',
      data: result,
    };
  }

  @Post(':id/transfer-owner')
  async transferOwnership(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    if (!userId || !conversationId || !newOwnerId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.transferOwnership(
      conversationId,
      userId,
      newOwnerId,
    );
    return {
      message: 'Chuyển quyền trưởng nhóm thành công',
      data: result,
    };
  }

  @Delete(':id/members/:memberId')
  async kickMember(
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !conversationId || !memberId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    await this.conversationService.kickMember(conversationId, userId, memberId);
    return {
      message: 'Đã xoá thành viên khỏi nhóm',
    };
  }

  @Post(':id/members/invite')
  async inviteMembers(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body('memberIds') memberIds: string[],
  ) {
    if (!userId || !conversationId || !memberIds || !Array.isArray(memberIds)) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.addMembers(conversationId, userId, memberIds);
    return {
      message: `Đã gửi lời mời đến ${result.count} người`,
    };
  }

  @Patch(':id/info')
  async updateGroupInfo(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
    @Body() data: { name?: string; avatarUrl?: string },
  ) {
    if (!userId || !conversationId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    return this.conversationService.updateGroupInfo(conversationId, userId, data);
  }

  @Delete(':id/leave')
  async leaveConversation(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !conversationId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    await this.conversationService.leaveConversation(conversationId, userId);
    return {
      message: 'Đã rời khỏi nhóm',
    };
  }
  @Delete(':id/disband')
  async disbandConversation(
    @Param('id') conversationId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !conversationId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    await this.conversationService.disbandConversation(conversationId, userId);
    return {
      message: 'Đã giải tán nhóm thành công',
    };
  }
}
