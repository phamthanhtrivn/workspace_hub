import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Body,
  Patch,
  Post,
} from '@nestjs/common';
import { PollService } from './poll.service';
import { POLL_ERROR_MESSAGES } from './types/poll.enums';

@Controller('api/polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get(':channelId')
  async getPollsInConversation(
    @Param('channelId') channelId: string,
    @Headers('x-user-id') userId: string,
    @Query('q') q?: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        POLL_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID,
      );
    }

    return this.pollService.getPollsInConversation(channelId, userId, q);
  }

  @Post(':channelId/messages/:messageId/votes')
  async votePoll(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('pollOptionId') pollOptionId: string,
  ) {
    if (!userId || !channelId || !messageId || !pollOptionId) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.MISSING_REQUIRED_DATA);
    }

    return this.pollService.votePollAndPublish(
      channelId,
      messageId,
      pollOptionId,
      userId,
    );
  }

  @Post(':channelId/messages/:messageId/options')
  async addPollOption(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body('text') text: string,
  ) {
    if (!userId || !channelId || !messageId || !text) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.MISSING_REQUIRED_DATA);
    }

    return this.pollService.addPollOptionAndPublish(
      channelId,
      messageId,
      text,
      userId,
    );
  }

  @Patch(':channelId/messages/:messageId')
  async updatePoll(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body()
    data: {
      title: string;
      multipleChoice: boolean;
      allowAddOptions: boolean;
      anonymous?: boolean;
      isLocked?: boolean;
    },
  ) {
    if (!userId || !channelId || !messageId || !data.title) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.MISSING_REQUIRED_DATA);
    }

    return this.pollService.updatePollAndPublish(
      channelId,
      messageId,
      data.title,
      data.multipleChoice,
      data.allowAddOptions,
      userId,
      data.anonymous,
      data.isLocked,
    );
  }
}
