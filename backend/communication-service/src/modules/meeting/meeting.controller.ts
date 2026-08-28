import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MeetingParticipantStatus } from '@prisma/client';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import { UpdateMeetingAccessDto } from './dto/update-meeting-access.dto';
import { UpdateMeetingParticipantRoleDto } from './dto/update-meeting-participant-role.dto';
import { MeetingService } from './meeting.service';
import {
  MeetingErrorMessage,
  MeetingSuccessMessage,
} from './types/meeting.enums';

@Controller('api/meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post('instant')
  async createInstantMeeting(
    @Headers('x-user-id') userId: string,
    @Body() body: CreateInstantMeetingDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const meeting = await this.meetingService.createInstantMeeting(
      userId,
      body,
    );
    return {
      message: MeetingSuccessMessage.CREATED,
      data: meeting,
    };
  }

  @Get()
  async getUserMeetings(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const meetings = await this.meetingService.getUserMeetings(userId);
    return {
      message: MeetingSuccessMessage.LISTED,
      data: meetings,
    };
  }

  @Get('join/:joinToken')
  async getJoinInfoByToken(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!joinToken) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_JOIN_TOKEN);
    }
    const meeting = await this.meetingService.getJoinInfoByToken(
      joinToken,
      userId,
    );
    return {
      message: MeetingSuccessMessage.DETAILS_RETRIEVED,
      data: meeting,
    };
  }

  @Post(':meetingId/join-requests')
  async requestJoin(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const result = await this.meetingService.requestJoin(meetingId, userId);
    return {
      message:
        result.participant.status === MeetingParticipantStatus.JOINED
          ? MeetingSuccessMessage.JOINED
          : MeetingSuccessMessage.JOIN_REQUESTED,
      data: result,
    };
  }

  @Get(':meetingId/join-requests')
  async getJoinRequests(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const requests = await this.meetingService.getJoinRequests(
      meetingId,
      userId,
    );
    return {
      message: MeetingSuccessMessage.JOIN_REQUESTS_LISTED,
      data: requests,
    };
  }

  @Post(':meetingId/join-requests/:userId/approve')
  async approveJoinRequest(
    @Headers('x-user-id') hostId: string,
    @Param('meetingId') meetingId: string,
    @Param('userId') requesterId: string,
  ) {
    if (!hostId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const participant = await this.meetingService.approveJoinRequest(
      meetingId,
      requesterId,
      hostId,
    );
    return {
      message: MeetingSuccessMessage.JOIN_APPROVED,
      data: participant,
    };
  }

  @Post(':meetingId/join-requests/:userId/reject')
  async rejectJoinRequest(
    @Headers('x-user-id') hostId: string,
    @Param('meetingId') meetingId: string,
    @Param('userId') requesterId: string,
  ) {
    if (!hostId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const participant = await this.meetingService.rejectJoinRequest(
      meetingId,
      requesterId,
      hostId,
    );
    return {
      message: MeetingSuccessMessage.JOIN_REJECTED,
      data: participant,
    };
  }

  @Patch(':meetingId/access')
  async updateAccess(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: UpdateMeetingAccessDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const meeting = await this.meetingService.updateAccess(
      meetingId,
      userId,
      body.allowJoinWithoutApproval,
    );
    return {
      message: MeetingSuccessMessage.ACCESS_UPDATED,
      data: meeting,
    };
  }

  @Get(':meetingId/participants')
  async getMeetingParticipants(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
    @Query('search') search?: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const participants = await this.meetingService.getMeetingParticipants(
      meetingId,
      userId,
      search,
    );
    return {
      message: MeetingSuccessMessage.PARTICIPANTS_LISTED,
      data: participants,
    };
  }

  @Patch(':meetingId/participants/:userId/role')
  async updateParticipantRole(
    @Headers('x-user-id') hostId: string,
    @Param('meetingId') meetingId: string,
    @Param('userId') targetUserId: string,
    @Body() body: UpdateMeetingParticipantRoleDto,
  ) {
    if (!hostId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const participant = await this.meetingService.updateParticipantRole(
      meetingId,
      targetUserId,
      hostId,
      body.role,
    );
    return {
      message: MeetingSuccessMessage.PARTICIPANT_ROLE_UPDATED,
      data: participant,
    };
  }

  @Post(':meetingId/participants/:userId/remove')
  async removeParticipant(
    @Headers('x-user-id') hostId: string,
    @Param('meetingId') meetingId: string,
    @Param('userId') targetUserId: string,
  ) {
    if (!hostId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const participant = await this.meetingService.removeParticipant(
      meetingId,
      targetUserId,
      hostId,
    );
    return {
      message: MeetingSuccessMessage.PARTICIPANT_REMOVED,
      data: participant,
    };
  }

  @Post(':meetingId/leave')
  async leaveMeeting(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const participant = await this.meetingService.leaveMeeting(
      meetingId,
      userId,
    );
    return {
      message: MeetingSuccessMessage.LEFT,
      data: participant,
    };
  }

  @Post(':meetingId/end')
  async endMeeting(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const meeting = await this.meetingService.endMeeting(meetingId, userId);
    return {
      message: MeetingSuccessMessage.ENDED,
      data: meeting,
    };
  }

  @Post(':meetingId/livekit-token')
  async createLiveKitToken(
    @Headers('x-user-id') userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    if (!meetingId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_MEETING_ID);
    }
    const token = await this.meetingService.createLiveKitToken(
      meetingId,
      userId,
    );
    return {
      message: MeetingSuccessMessage.LIVEKIT_TOKEN_CREATED,
      data: token,
    };
  }
}
