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
import { decodeHeaderUtf8 } from '../../common/utils/string.util';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import { ListJoinRequestsDto } from './dto/list-join-requests.dto';
import { UpdateMeetingSettingsDto } from './dto/update-meeting-settings.dto';
import { MeetingService } from './meeting.service';
import {
  MEETING_ERROR_MESSAGES,
  MEETING_SUCCESS_MESSAGES,
} from './types/meeting.enums';

@Controller('api/meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post('instant')
  async createInstantMeeting(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') avatarUrl: string,
    @Body() createInstantMeetingDto: CreateInstantMeetingDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const meeting = await this.meetingService.createInstantMeeting({
      userId,
      userName: decodeHeaderUtf8(userName),
      avatarUrl: decodeHeaderUtf8(avatarUrl),
      dto: createInstantMeetingDto ?? {},
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.INSTANT_CREATED,
      data: meeting,
    };
  }

  @Get(':joinToken/access')
  async getMeetingAccess(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const meeting = await this.meetingService.getMeetingAccess({
      joinToken,
      userId,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.ACCESS_CHECKED,
      data: meeting,
    };
  }

  @Post(':joinToken/join')
  async joinMeeting(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') avatarUrl: string,
    @Body() joinMeetingDto: CreateInstantMeetingDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const meeting = await this.meetingService.joinMeeting({
      joinToken,
      userId,
      userName: decodeHeaderUtf8(userName),
      avatarUrl: decodeHeaderUtf8(avatarUrl),
      dto: joinMeetingDto ?? {},
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOINED,
      data: meeting,
    };
  }

  @Patch(':joinToken/settings')
  async updateMeetingSettings(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
    @Body() updateMeetingSettingsDto: UpdateMeetingSettingsDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const settings = await this.meetingService.updateMeetingSettings({
      joinToken,
      userId,
      dto: updateMeetingSettingsDto,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.SETTINGS_UPDATED,
      data: settings,
    };
  }

  @Post(':joinToken/join-requests')
  async requestJoinApproval(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-avatar') avatarUrl: string,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const request = await this.meetingService.requestJoinApproval({
      joinToken,
      userId,
      userName: decodeHeaderUtf8(userName),
      avatarUrl: decodeHeaderUtf8(avatarUrl),
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUESTED,
      data: request,
    };
  }

  @Get(':joinToken/join-requests')
  async listJoinRequests(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
    @Query() query: ListJoinRequestsDto,
  ) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const requests = await this.meetingService.listJoinRequests({
      joinToken,
      userId,
      query,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUESTS_LISTED,
      data: requests,
    };
  }

  @Post(':joinToken/join-requests/approve-all')
  async approveAllJoinRequests(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.meetingService.approveAllJoinRequests({
      joinToken,
      userId,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUEST_APPROVED,
      data: result,
    };
  }

  @Post(':joinToken/join-requests/decline-all')
  async declineAllJoinRequests(
    @Param('joinToken') joinToken: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.meetingService.declineAllJoinRequests({
      joinToken,
      userId,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUEST_DECLINED,
      data: result,
    };
  }

  @Post(':joinToken/join-requests/:targetUserId/approve')
  async approveJoinRequest(
    @Param('joinToken') joinToken: string,
    @Param('targetUserId') targetUserId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.meetingService.approveJoinRequest({
      joinToken,
      userId,
      targetUserId,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUEST_APPROVED,
      data: result,
    };
  }

  @Post(':joinToken/join-requests/:targetUserId/decline')
  async declineJoinRequest(
    @Param('joinToken') joinToken: string,
    @Param('targetUserId') targetUserId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.meetingService.declineJoinRequest({
      joinToken,
      userId,
      targetUserId,
    });

    return {
      message: MEETING_SUCCESS_MESSAGES.JOIN_REQUEST_DECLINED,
      data: result,
    };
  }
}
