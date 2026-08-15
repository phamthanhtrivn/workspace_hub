import {
  Controller,
  Delete,
  Post,
  Get,
  Param,
  Body,
  Headers,
  BadRequestException,
  Patch,
  Query,
} from '@nestjs/common';
import { SpaceService } from './space.service';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_SUCCESS_MESSAGES_LABEL,
} from './types/space.enums';
import { InviteSpaceMembersDto } from './dto/invite-space-members.dto';
import { decodeHeaderUtf8 } from '../../common/utils/string.util';
import { UpdateSpaceMemberRoleDto } from './dto/update-space-member-role.dto';
import { UpdateSpaceSettingDto } from './dto/update-space-setting.dto';

@Controller('api/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Post()
  async createSpace(
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    const space = await this.spaceService.createSpace(userId, body.name);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CREATED,
      data: space,
    };
  }

  @Get()
  async getUserSpaces(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    const spaces = await this.spaceService.getUserSpaces(userId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.LISTED,
      data: spaces,
    };
  }

  @Get(':spaceId')
  async getSpaceDetails(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const space = await this.spaceService.getSpaceDetails(userId, spaceId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.DETAILS_RETRIEVED,
      data: space,
    };
  }

  @Patch(':spaceId')
  async updateSpace(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string },
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const space = await this.spaceService.updateSpace(
      userId,
      spaceId,
      body.name,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.UPDATED,
      data: space,
    };
  }

  @Patch(':spaceId/settings')
  async updateSpaceSettings(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: UpdateSpaceSettingDto,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const setting = await this.spaceService.updateSpaceSettings(
      userId,
      spaceId,
      body,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.SETTINGS_UPDATED,
      data: setting,
    };
  }

  @Get(':spaceId/members')
  async getSpaceMembers(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const members = await this.spaceService.getSpaceMembers(
      userId,
      spaceId,
      search,
      limit,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.MEMBERS_LISTED,
      data: members,
    };
  }

  @Patch(':spaceId/members/:memberId/role')
  async updateSpaceMemberRole(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateSpaceMemberRoleDto,
  ) {
    if (!userId || !spaceId || !memberId || !body?.role) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const member = await this.spaceService.updateSpaceMemberRole(
      userId,
      spaceId,
      memberId,
      body.role,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.MEMBER_ROLE_UPDATED,
      data: member,
    };
  }

  @Delete(':spaceId/members/:memberId')
  async removeSpaceMember(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Param('memberId') memberId: string,
  ) {
    if (!userId || !spaceId || !memberId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.spaceService.removeSpaceMember(userId, spaceId, memberId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.MEMBER_REMOVED,
    };
  }

  @Delete(':spaceId/leave')
  async leaveSpace(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.spaceService.leaveSpace(userId, spaceId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.LEFT,
    };
  }

  @Delete(':spaceId')
  async deleteSpace(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.spaceService.deleteSpace(userId, spaceId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.DELETED,
    };
  }

  @Post(':spaceId/channels')
  async createChannel(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_SPACE_ID);
    }
    const channel = await this.spaceService.createChannel(
      userId,
      spaceId,
      body.name,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CHANNEL_CREATED,
      data: channel,
    };
  }

  @Get(':spaceId/channels')
  async getSpaceChannels(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Query('search') search?: string,
  ) {
    if (!userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_SPACE_ID);
    }
    const channels = await this.spaceService.getSpaceChannels(userId, spaceId, search);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CHANNEL_LISTED,
      data: channels,
    };
  }

  @Post(':spaceId/invite')
  async inviteMembers(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') userAvatar: string,
    @Param('spaceId') spaceId: string,
    @Body() body: InviteSpaceMembersDto,
  ) {
    if (!userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_USER_ID);
    }
    if (!spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_SPACE_ID);
    }
    const decodedUserName = decodeHeaderUtf8(userName);
    const result = await this.spaceService.inviteMembersToSpace(
      userId,
      spaceId,
      body.invitees,
      {
        fullName: decodedUserName,
        avatarUrl: userAvatar,
      },
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.INVITED,
      data: result,
    };
  }

  @Get(':spaceId/invitations')
  async getSpaceInvitations(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
  ) {
    if (!userId || !spaceId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const invitations = await this.spaceService.getSpaceInvitations(
      userId,
      spaceId,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.INVITATIONS_LISTED,
      data: invitations,
    };
  }

  @Delete(':spaceId/invitations/:invitationId')
  async cancelSpaceInvitation(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    if (!userId || !spaceId || !invitationId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    await this.spaceService.cancelSpaceInvitation(
      userId,
      spaceId,
      invitationId,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.INVITATION_CANCELLED,
    };
  }

  @Post(':spaceId/invitations/:invitationId/resend')
  async resendSpaceInvitation(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    if (!userId || !spaceId || !invitationId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }
    const invitation = await this.spaceService.resendSpaceInvitation(
      userId,
      spaceId,
      invitationId,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.INVITATION_RESENT,
      data: invitation,
    };
  }
}
