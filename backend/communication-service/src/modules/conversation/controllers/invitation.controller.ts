import { Controller, Get, Post, Param, Headers, BadRequestException, Body } from '@nestjs/common';
import { InvitationService } from '../services/invitation.service';

@Controller('api/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get('pending')
  async getPendingInvitations(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const invitations = await this.invitationService.getPendingInvitations(userId);
    return {
      message: 'Lấy danh sách lời mời thành công',
      data: invitations,
    };
  }

  @Post(':id/accept')
  async acceptInvitation(
    @Headers('x-user-id') userId: string,
    @Param('id') invitationId: string
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const result = await this.invitationService.acceptInvitation(userId, invitationId);
    return {
      message: 'Đã chấp nhận lời mời',
      data: result,
    };
  }

  @Post(':id/decline')
  async declineInvitation(
    @Headers('x-user-id') userId: string,
    @Param('id') invitationId: string
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const result = await this.invitationService.declineInvitation(userId, invitationId);
    return {
      message: 'Đã từ chối lời mời',
      data: result,
    };
  }
}
