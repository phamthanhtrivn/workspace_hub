import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { POLL_ERROR_MESSAGES } from './types/poll.enums';

@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  async getPollsInConversation(channelId: string) {
    return this.prisma.poll.findMany({
      where: {
        message: {
          channelId,
        },
      },
      include: {
        options: { include: { votes: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async votePoll(messageId: string, pollOptionId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
      include: { options: { include: { votes: true } } },
    });

    if (!poll) {
      throw new Error(POLL_ERROR_MESSAGES.NOT_FOUND);
    }

    const option = poll.options.find((opt) => opt.id === pollOptionId);
    if (!option) {
      throw new Error(POLL_ERROR_MESSAGES.OPTION_NOT_FOUND);
    }

    const hasVotedThisOption = option.votes.some((v) => v.userId === userId);

    if (hasVotedThisOption) {
      // Remove vote
      await this.prisma.pollVote.deleteMany({
        where: { pollOptionId, userId },
      });
    } else {
      if (!poll.multipleChoice) {
        // Remove votes from other options in this poll for this user
        const optionIds = poll.options.map((opt) => opt.id);
        await this.prisma.pollVote.deleteMany({
          where: { userId, pollOptionId: { in: optionIds } },
        });
      }

      // Add vote
      await this.prisma.pollVote.create({
        data: {
          userId,
          pollOptionId,
        },
      });
    }

    // Bump message to bottom and return it
    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
      },
    });
  }

  async addPollOption(messageId: string, text: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { messageId },
    });
    if (!poll) throw new Error(POLL_ERROR_MESSAGES.NOT_FOUND);
    if (!poll.allowAddOptions) throw new Error(POLL_ERROR_MESSAGES.ADD_OPTION_PREVENTED);

    const newOption = await this.prisma.pollOption.create({
      data: {
        pollId: poll.id,
        text,
        createdBy: userId,
      },
    });

    // Automatically vote for this newly created option
    await this.votePoll(messageId, newOption.id, userId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
      },
    });
  }

  async updatePoll(
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous?: boolean,
    isLocked?: boolean,
  ) {
    await this.prisma.poll.update({
      where: { messageId },
      data: {
        title,
        multipleChoice,
        allowAddOptions,
        ...(anonymous !== undefined && { anonymous }),
        ...(isLocked !== undefined && { isLocked }),
      },
    });

    return this.prisma.message.update({
      where: { id: messageId },
      data: { createdAt: new Date() },
      include: {
        poll: { include: { options: { include: { votes: true } } } },
        medias: true,
        reactions: true,
      },
    });
  }
}
