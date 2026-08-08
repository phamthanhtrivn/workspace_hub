import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateDirectConversationDto } from './dto/create-direct-channel.dto';
import { UpdateConversationSettingDto } from './dto/update-channel-setting.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ChannelService } from './channel.service';

@Controller('api/channels')
export class ConversationController {
  constructor(
    @Inject(ChannelService)
    private readonly conversationService: ChannelService,
  ) {}

  @Post('direct')
  async createDirectConversation(
    @Headers('x-user-id') userId: string,
    @Body() createDirectDto: CreateDirectConversationDto,
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }

    const channel = await this.conversationService.createDirectConversation(
      userId,
      createDirectDto.participantId,
    );

    return {
      message: 'Cuộc trò chuyện được tạo thành công',
      data: channel,
    };
  }

  @Get()
  async getUserConversations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }

    const channels =
      await this.conversationService.getUserConversations(userId);

    return {
      message: 'Lấy danh sách cuộc trò chuyện thành công',
      data: channels,
    };
  }

  @Patch(':id/settings')
  async updateConversationSettings(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body() updateSettingDto: UpdateConversationSettingDto,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException('Thiếu userId hoặc channelId');
    }
    const result = await this.conversationService.updateConversationSettings(
      channelId,
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
    @Param('id') channelId: string,
    @Param('memberId') memberId: string,
    @Headers('x-user-id') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ) {
    if (!userId || !channelId || !memberId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.updateMemberRole(
      channelId,
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
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    if (!userId || !channelId || !newOwnerId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.transferOwnership(
      channelId,
      userId,
      newOwnerId,
    );
    return {
      message: 'Chuyển quyền trưởng nhóm thành công',
      data: result,
    };
  }

  // @Delete(':id/members/:memberId')
  // async kickMember(
  //   @Param('id') channelId: string,
  //   @Param('memberId') memberId: string,
  //   @Headers('x-user-id') userId: string,
  // ) {
  //   if (!userId || !channelId || !memberId) {
  //     throw new BadRequestException('Thiếu thông tin yêu cầu');
  //   }
  //   await this.conversationService.kickMember(channelId, userId, memberId);
  //   return {
  //     message: 'Đã xoá thành viên khỏi nhóm',
  //   };
  // }

  @Get(':id/avatar/presigned-url')
  getAvatarPresignedUrl(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    if (!userId || !channelId || !fileName || !contentType) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    return this.conversationService.getAvatarUploadPresignedUrl(
      channelId,
      userId,
      fileName,
      contentType,
    );
  }

  // @Patch(':id/info')
  // updateGroupInfo(
  //   @Param('id') channelId: string,
  //   @Headers('x-user-id') userId: string,
  //   @Body() data: { name?: string; avatarUrl?: string },
  // ) {
  //   if (!userId || !channelId) {
  //     throw new BadRequestException('Thiếu thông tin yêu cầu');
  //   }
  //   return this.conversationService.updateGroupInfo(channelId, userId, data);
  // }

  @Delete(':id/leave')
  async leaveConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    await this.conversationService.leaveConversation(channelId, userId);
    return {
      message: 'Đã rời khỏi nhóm',
    };
  }

  @Delete(':id/disband')
  async disbandConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    await this.conversationService.disbandConversation(channelId, userId);
    return {
      message: 'Đã giải tán nhóm thành công',
    };
  }

  @Patch(':id/mute')
  async muteConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('muted') muted: boolean,
  ) {
    if (!userId || !channelId || muted === undefined) {
      throw new BadRequestException('Thiếu thông tin yêu cầu');
    }
    const result = await this.conversationService.muteConversation(
      channelId,
      userId,
      muted,
    );
    return {
      message: muted
        ? 'Đã tắt thông báo cuộc trò chuyện'
        : 'Đã bật thông báo cuộc trò chuyện',
      data: result,
    };
  }
}
