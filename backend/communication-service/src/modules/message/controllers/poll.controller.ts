import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PollService } from '../services/poll.service';

@Controller('api/polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get(':conversationId')
  async getPollsInConversation(
    @Param('conversationId') conversationId: string,
  ) {
    return this.pollService.getPollsInConversation(conversationId);
  }
}
