import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { PollService } from './poll.service';
import { POLL_ERROR_MESSAGES } from './types/poll.enums';

@Controller('api/polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get(':channelId')
  async getPollsInConversation(
    @Param('channelId') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(POLL_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID);
    }

    return this.pollService.getPollsInConversation(channelId, userId);
  }
}
