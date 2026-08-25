import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import { UpdateMeetingAccessDto } from './dto/update-meeting-access.dto';
import { MeetingService } from './meeting.service';
import {
  MeetingErrorMessage,
  MeetingParticipantStatusValue,
  MeetingRoute,
  MeetingSuccessMessage,
} from './types/meeting.enums';

@Controller(MeetingRoute.ROOT)
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post(MeetingRoute.INSTANT)
  async createInstantMeeting(
    @Headers('x-user-id') userId: string,
    @Body() body: CreateInstantMeetingDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MeetingErrorMessage.MISSING_USER_ID);
    }
    const meeting = await this.meetingService.createInstantMeeting(userId, body);
    return {
      message: MeetingSuccessMessage.CREATED,
      data: meeting,
    };
  }

  @Get(MeetingRoute.LIST)
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

  @Get(MeetingRoute.JOIN_BY_TOKEN)
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

  @Post(MeetingRoute.JOIN_REQUESTS)
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
        result.participant.status === MeetingParticipantStatusValue.JOINED
          ? MeetingSuccessMessage.JOINED
          : MeetingSuccessMessage.JOIN_REQUESTED,
      data: result,
    };
  }

  @Get(MeetingRoute.JOIN_REQUESTS)
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

  @Post(MeetingRoute.APPROVE_JOIN_REQUEST)
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

  @Post(MeetingRoute.REJECT_JOIN_REQUEST)
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

  @Patch(MeetingRoute.ACCESS)
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
}
