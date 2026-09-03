import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { decodeHeaderUtf8 } from '../../common/utils/string.util';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
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
}
