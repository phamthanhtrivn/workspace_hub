import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationService } from './invitation.service';

@Controller('api')
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Post('projects/:projectId/invitations')
  async create(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return ApiResponse.success(await this.invitations.create(userId, projectId, dto), 'Invitation sent successfully');
  }

  @Get('project-invitations/pending')
  async findPending(@CurrentUserId() userId: string) {
    return ApiResponse.success(await this.invitations.findPending(userId), 'Pending invitations loaded successfully');
  }

  @Get('projects/:projectId/invitations')
  async findProjectPending(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(
      await this.invitations.findProjectPending(userId, projectId),
      'Project invitations loaded successfully',
    );
  }

  @Post('projects/:projectId/invitations/:invitationId/resend')
  async resend(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return ApiResponse.success(
      await this.invitations.resend(userId, projectId, invitationId),
      'Invitation resent successfully',
    );
  }

  @Post('project-invitations/:invitationId/accept')
  async accept(
    @CurrentUserId() userId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return ApiResponse.success(await this.invitations.accept(userId, invitationId), 'Invitation accepted successfully');
  }

  @Post('project-invitations/:invitationId/decline')
  async decline(
    @CurrentUserId() userId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return ApiResponse.success(await this.invitations.decline(userId, invitationId), 'Invitation declined successfully');
  }

  @Delete('projects/:projectId/invitations/:invitationId')
  async cancel(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    await this.invitations.cancel(userId, projectId, invitationId);
    return ApiResponse.success(null, 'Invitation cancelled successfully');
  }
}
