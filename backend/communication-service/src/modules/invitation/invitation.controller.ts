import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { INVITATION_SUCCESS_MESSAGES_LABEL } from './types/invitation.enums';
import { decodeHeaderUtf8 } from '../../common/utils/string.util';

@Controller('api/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get('pending')
  async getPendingInvitations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }
    const invitations =
      await this.invitationService.getPendingInvitations(userId);
    return {
      message: INVITATION_SUCCESS_MESSAGES_LABEL.LISTED,
      data: invitations,
    };
  }

  @Post(':id/accept')
  async acceptInvitation(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') userAvatar: string,
    @Param('id') invitationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }
    const decodedUserName = decodeHeaderUtf8(userName);
    const result = await this.invitationService.acceptInvitation(
      userId,
      invitationId,
      {
        fullName: decodedUserName,
        avatarUrl: userAvatar,
      },
    );
    return {
      message: INVITATION_SUCCESS_MESSAGES_LABEL.ACCEPTED,
      data: result,
    };
  }

  @Post(':id/decline')
  async declineInvitation(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') userAvatar: string,
    @Param('id') invitationId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }
    const decodedUserName = decodeHeaderUtf8(userName);
    const result = await this.invitationService.declineInvitation(
      userId,
      invitationId,
      {
        fullName: decodedUserName,
        avatarUrl: userAvatar,
      },
    );
    return {
      message: INVITATION_SUCCESS_MESSAGES_LABEL.DECLINED,
      data: result,
    };
  }
}
