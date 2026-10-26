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
  UnauthorizedException,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UpdateChannelSettingDto } from './dto/update-channel-setting.dto';
import { ChannelResource, SkipChannelResource } from './access/channel-resource.decorator';
import { UpdateChannelInfoDto } from './dto/update-channel-info.dto';
import { AddChannelMembersDto } from './dto/add-channel-members.dto';
import { PrivateChannelMembersQueryDto } from './dto/private-channel-members-query.dto';
import { PrivateChannelMembersService } from './private-channel-members.service';
import { CheckChannelTaskPermissionDto } from './dto/check-channel-task-permission.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ChannelService } from './channel.service';
import { decodeHeaderUtf8 } from '../../common/utils/string.util';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import {
  CHANNEL_ERROR_MESSAGES,
  CHANNEL_SUCCESS_MESSAGES,
} from './types/channel.enums';

@Controller('api/channels')
@ChannelResource('channel')
export class ChannelController {
  constructor(
    @Inject(ChannelService)
    private readonly channelService: ChannelService,
    private readonly config: RuntimeConfigService,
    private readonly privateMembers: PrivateChannelMembersService,
  ) {}

  @Post('internal/:id/task-create-permission')
  @SkipChannelResource()
  async checkTaskCreatePermission(
    @Param('id') channelId: string,
    @Headers('x-internal-service-key') serviceKey: string,
    @Body() request: CheckChannelTaskPermissionDto,
  ) {
    if (!serviceKey || serviceKey !== this.config.internalServiceKey) {
      throw new UnauthorizedException('Invalid internal service key');
    }
    await this.channelService.assertCanCreateTaskInChannel(
      channelId,
      request.projectId,
      request.userId,
    );
    return { data: { allowed: true } };
  }

  @Get()
  async getUserChannels(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const channels = await this.channelService.getUserChannels(userId);

    return {
      message: CHANNEL_SUCCESS_MESSAGES.LISTED,
      data: channels,
    };
  }

  @Patch(':id/settings')
  async updateChannelSettings(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body() updateSettingDto: UpdateChannelSettingDto,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID,
      );
    }
    const result = await this.channelService.updateChannelSettings(
      channelId,
      userId,
      updateSettingDto,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.SETTINGS_UPDATED,
      data: result,
    };
  }

  @Get(':id/members')
  async getChannelMembers(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID,
      );
    }

    const result = await this.channelService.getChannelMembers(
      channelId,
      userId,
      search,
      limit,
    );

    return {
      message: CHANNEL_SUCCESS_MESSAGES.MEMBERS_LISTED,
      data: result,
    };
  }

  @Get(':id/member-directory')
  async getPrivateMemberDirectory(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Headers('x-user-id') userId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: PrivateChannelMembersQueryDto,
  ) {
    if (!userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_USER_ID);
    }
    return {
      message: CHANNEL_SUCCESS_MESSAGES.MEMBERS_LISTED,
      data: await this.privateMembers.getDirectory(channelId, userId, query),
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
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    const result = await this.channelService.updateMemberRole(
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

  @Delete(':id/members/:memberId')
  async kickMember(
    @Param('id') channelId: string,
    @Param('memberId') memberId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId || !memberId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    await this.channelService.kickMember(channelId, userId, memberId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.MEMBER_REMOVED,
    };
  }

  @Post(':id/members')
  async addMembers(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: AddChannelMembersDto,
  ) {
    return { data: await this.channelService.addMembers(channelId, userId, body.userIds) };
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
  //   await this.channelService.kickMember(channelId, userId, memberId);
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
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    return this.channelService.getAvatarUploadPresignedUrl(
      channelId,
      userId,
      fileName,
      contentType,
    );
  }

  @Patch(':id/info')
  async updateChannelInfo(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body() data: UpdateChannelInfoDto,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    const result = await this.channelService.updateChannelInfo(
      channelId,
      userId,
      data,
    );
    return {
      message: CHANNEL_SUCCESS_MESSAGES.INFO_UPDATED,
      data: result,
    };
  }

  @Delete(':id/leave')
  async leaveChannel(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    await this.channelService.leaveChannel(channelId, userId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.LEFT,
    };
  }

  @Delete(':id/disband')
  async disbandChannel(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    await this.channelService.disbandChannel(channelId, userId);
    return {
      message: CHANNEL_SUCCESS_MESSAGES.DISBANDED,
    };
  }

  @Patch(':id/mute')
  async muteChannel(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('muted') muted: boolean,
  ) {
    if (!userId || !channelId || muted === undefined) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    const result = await this.channelService.muteChannel(
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

  @Patch(':id/pin')
  async pinChannel(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Body('pinned') pinned: boolean,
  ) {
    if (!userId || !channelId || pinned === undefined) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }
    const result = await this.channelService.pinChannel(
      channelId,
      userId,
      pinned,
    );
    return {
      message: pinned ? 'Channel pinned' : 'Channel unpinned',
      data: result,
    };
  }

  @Post(':id/join')
  async joinChannel(
    @Param('id') channelId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException('Missing channelId or userId');
    }
    const decodedUserName = decodeHeaderUtf8(userName);
    const result = await this.channelService.joinChannel(
      channelId,
      userId,
      decodedUserName,
    );
    return {
      message: 'Joined channel successfully',
      data: result,
    };
  }
}
