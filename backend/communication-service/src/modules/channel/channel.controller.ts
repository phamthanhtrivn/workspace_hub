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
import { CHANNEL_ERROR_MESSAGES, CHANNEL_SUCCESS_MESSAGES } from './types/channel.enums';

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
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const channel = await this.conversationService.createDirectConversation(
      userId,
      createDirectDto.participantId,
    );

    return {
      message: CHANNEL_SUCCESS_MESSAGES.CREATED,
      data: channel,
    };
  }

  @Get()
  async getUserConversations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const channels =
      await this.conversationService.getUserConversations(userId);

    return {
      message: CHANNEL_SUCCESS_MESSAGES.LISTED,
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
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID);
    }
    const result = await this.conversationService.updateConversationSettings(
      channelId,
      userId,
      updateSettingDto,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.SETTINGS_UPDATED,
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
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const result = await this.conversationService.updateMemberRole(
      channelId,
      userId,
      memberId,
      updateRoleDto.role,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.ROLE_UPDATED,
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
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const result = await this.conversationService.transferOwnership(
      channelId,
      userId,
      newOwnerId,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.OWNER_TRANSFERRED,
      data: result,
    };
  }

  @Delete(':id/members/:memberId')
  async kickMember(
    @Param('id') channelId: string,
    @Param('memberId') memberId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId || !memberId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.conversationService.kickMember(channelId, userId, memberId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.MEMBER_REMOVED,
    };
  }

  // @Delete(':id/members/:memberId')
  // async kickMember(
  //   @Param('id') channelId: string,
  //   @Param('memberId') memberId: string,
  //   @Headers('x-user-id') userId: string,
  // ) {
  //   if (!userId || !channelId || !memberId) {
  //     throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
  //   }
  //   await this.conversationService.kickMember(channelId, userId, memberId);
  //   return {
  //     message: 'Member removed successfully',
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
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    return this.conversationService.getAvatarUploadPresignedUrl(
      channelId,
      userId,
      fileName,
      contentType,
    );
  }

  @Patch(':id/info')
  async updateGroupInfo(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body() data: { name?: string; avatarUrl?: string },
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const result = await this.conversationService.updateGroupInfo(
      channelId,
      userId,
      data,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.INFO_UPDATED,
      data: result,
    };
  }

  // @Patch(':id/info')
  // updateGroupInfo(
  //   @Param('id') channelId: string,
  //   @Headers('x-user-id') userId: string,
  //   @Body() data: { name?: string; avatarUrl?: string },
  // ) {
  //   if (!userId || !channelId) {
  //     throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
  //   }
  //   return this.conversationService.updateGroupInfo(channelId, userId, data);
  // }

  @Delete(':id/leave')
  async leaveConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.conversationService.leaveConversation(channelId, userId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.LEFT,
    };
  }

  @Delete(':id/disband')
  async disbandConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.conversationService.disbandConversation(channelId, userId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.DISBANDED,
    };
  }

  @Patch(':id/mute')
  async muteConversation(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('muted') muted: boolean,
  ) {
    if (!userId || !channelId || muted === undefined) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const result = await this.conversationService.muteConversation(
      channelId,
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
}
