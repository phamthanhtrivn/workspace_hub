import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PollService } from './poll.service';

@Controller('api/polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get(':channelId')
  async getPollsInConversation(@Param('channelId') channelId: string) {
    return this.pollService.getPollsInConversation(channelId);
  }
}
